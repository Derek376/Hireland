package com.hireland.community;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hireland.community.config.DemoIdentity;
import com.hireland.community.dto.ApiModels.*;
import com.hireland.community.dto.JobSnapshot;
import com.hireland.community.entity.CheckoutOrder;
import com.hireland.community.exception.ApiException;
import com.hireland.community.repository.*;
import com.hireland.community.service.*;
import com.stripe.model.checkout.Session;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:community-tests;DB_CLOSE_DELAY=-1", "community.seed-enabled=false"})
@AutoConfigureMockMvc
class ApiIntegrationTest {
    @TestConfiguration static class StubConfiguration {
        @Bean @Primary StubStripeGateway stubStripeGateway() { return new StubStripeGateway(); }
    }
    static class StubStripeGateway implements StripeGateway {
        final Map<String, Session> sessions = new ConcurrentHashMap<>();
        final AtomicInteger retrieves = new AtomicInteger();
        volatile boolean createFails;
        volatile boolean retrieveFails;
        @Override public Session createCheckout(CheckoutOrder order) {
            if (createFails) throw new ApiException(503, "PAYMENT_UNAVAILABLE", "Stripe unavailable.");
            Session s = new Session();
            s.setId("cs_test_" + UUID.randomUUID()); s.setLivemode(false); s.setMode("payment");
            s.setClientReferenceId(order.getUserId());
            s.setMetadata(new HashMap<>(Map.of("userId", order.getUserId(), "topicId", order.getTopic().getId(), "orderId", order.getId())));
            s.setAmountTotal(99L); s.setAmountSubtotal(99L); s.setCurrency("eur");
            s.setPaymentStatus("unpaid"); s.setStatus("open");
            s.setUrl("https://checkout.stripe.com/c/pay/" + s.getId());
            sessions.put(s.getId(), s);
            return s;
        }
        @Override public Session retrieveCheckout(String id) {
            retrieves.incrementAndGet();
            if (retrieveFails) throw new ApiException(503, "PAYMENT_UNAVAILABLE", "Stripe unavailable.");
            return sessions.get(id);
        }
        void reset() { sessions.clear(); retrieves.set(0); createFails=false; retrieveFails=false; }
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired DiscussionService discussions;
    @Autowired JobImportService importer;
    @Autowired PaymentService payments;
    @Autowired TopicRepository topics;
    @Autowired CommentRepository comments;
    @Autowired OrderRepository orders;
    @Autowired EntitlementRepository entitlements;
    @Autowired JobSnapshotRepository jobs;
    @Autowired StubStripeGateway stripe;
    String topicId;
    JobSnapshot job;
    @BeforeEach void setup() {
        entitlements.deleteAll(); orders.deleteAll(); comments.deleteAll(); jobs.deleteAll(); topics.deleteAll(); stripe.reset();
        job = job("job_demo_google_grad_swe_001", "Graduate Software Engineer");
        importer.importJobs(List.of(job));
        topicId = discussions.byJob(job.jobKey()).topicId();
        for (int i=1; i<=6; i++) discussions.addComment(topicId, new CreateComment("Student " + i, "Comment " + i));
    }
    JobSnapshot job(String key, String title) {
        Instant time = Instant.parse("2026-10-10T08:00:00Z");
        return new JobSnapshot(key, "Google", title, "Dublin", JobSnapshot.Category.TECH,
            "Synthetic job description.", "SYNTHETIC", "https://example.com/jobs/test", null, time, time, JobSnapshot.Status.UNKNOWN, true);
    }
    ResultActions postJson(String url, Object body) throws Exception {
        return mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body)));
    }
    Session checkout() { return stripe.sessions.get(payments.checkout(topicId).sessionId()); }
    void paid(Session s) { s.setPaymentStatus("paid"); s.setStatus("complete"); }

    @Test void healthAndSearchAreIndependent() throws Exception {
        mvc.perform(get("/api/v1/health")).andExpect(status().isOk()).andExpect(jsonPath("$.module").value("job-community"));
        mvc.perform(get("/api/v1/discussions").param("query", "software").param("company", "google"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].commentCount").value(6)).andExpect(jsonPath("$.disclaimer").isNotEmpty());
        mvc.perform(get("/api/v1/discussions").param("query", "does not exist")).andExpect(jsonPath("$.items.length()").value(0));
    }
    @ParameterizedTest @ValueSource(strings={"0", "1", "100", "-1", "2147483647"})
    void freeAccessAlwaysReturnsOnlyLatestThree(String page) throws Exception {
        mvc.perform(get("/api/v1/discussions/" + topicId + "/comments").param("page", page).param("size", "100"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(3))
            .andExpect(jsonPath("$.items[0].body").value("Comment 6"))
            .andExpect(jsonPath("$.items[2].body").value("Comment 4"))
            .andExpect(jsonPath("$.total").value(6)).andExpect(jsonPath("$.visibleLimit").value(3))
            .andExpect(jsonPath("$.page").value(0)).andExpect(jsonPath("$.size").value(3))
            .andExpect(jsonPath("$.unlocked").value(false)).andExpect(jsonPath("$.hasMore").value(true));
    }
    @Test void frontendSuccessFlagsAndUserIdsCannotUnlock() throws Exception {
        mvc.perform(get("/api/v1/discussions/" + topicId + "/comments").param("success", "true").param("unlocked", "true").param("userId", "admin"))
            .andExpect(jsonPath("$.items.length()").value(3)).andExpect(jsonPath("$.unlocked").value(false));
        postJson("/api/v1/payments/confirm", Map.of("success", true)).andExpect(status().isBadRequest());
        assertThat(entitlements.count()).isZero();
    }
    @Test void blankAndLongCommentsAreRejected() throws Exception {
        for (String body : List.of("", "   ", "x".repeat(1001))) {
            postJson("/api/v1/discussions/" + topicId + "/comments", Map.of("displayName", "Student", "body", body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.requestId").isNotEmpty()).andExpect(header().exists("X-Request-Id"));
        }
        postJson("/api/v1/discussions/" + topicId + "/comments", Map.of("body", "hello"))
            .andExpect(status().isBadRequest());
        assertThat(comments.countByTopicId(topicId)).isEqualTo(6);
    }
    @Test void freeUsersCanPostAndNewestCommentEntersPreview() throws Exception {
        postJson("/api/v1/discussions/" + topicId + "/comments", new CreateComment("My Name", "New comment"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.body").value("New comment"));
        mvc.perform(get("/api/v1/discussions/" + topicId + "/comments"))
            .andExpect(jsonPath("$.items.length()").value(3)).andExpect(jsonPath("$.items[0].body").value("New comment"));
    }
    @Test void zeroAndTwoCommentsDoNotAdvertiseHiddenContent() {
        String id = discussions.create(new CreateTopic(null, "Local", "Manual topic", null)).topicId();
        assertThat(discussions.comments(id, 0, 20).items()).isEmpty();
        assertThat(discussions.comments(id, 0, 20).hasMore()).isFalse();
        discussions.addComment(id, new CreateComment("A", "First"));
        discussions.addComment(id, new CreateComment("B", "Second"));
        assertThat(discussions.comments(id, 99, 100).items()).hasSize(2);
        assertThat(discussions.comments(id, 99, 100).hasMore()).isFalse();
    }
    @Test void identicalTimestampsUseDescendingIdOrder() {
        var topic = topics.findById(topicId).orElseThrow();
        comments.deleteAll();
        for (int i=0; i<6; i++) comments.save(new com.hireland.community.entity.CommentEntity(topic, "demo", "Student", "Tie " + i, Instant.EPOCH, true));
        var expected = comments.findAll().stream().map(c -> c.getId()).sorted(Comparator.reverseOrder()).limit(3).toList();
        assertThat(discussions.comments(topicId, 0, 20).items().stream().map(Comment::id).toList()).isEqualTo(expected);
    }
    @Test void unknownTopicsAndJobsHaveStructuredErrors() throws Exception {
        mvc.perform(get("/api/v1/discussions/missing/comments")).andExpect(status().isNotFound());
        postJson("/api/v1/discussions/missing/comments", new CreateComment("A", "Hi")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/discussions/by-job/missing")).andExpect(status().isNotFound()).andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        postJson("/api/v1/payments/checkout", new CheckoutRequest("missing")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/payments/entitlement").param("topicId", "missing")).andExpect(status().isNotFound());
    }
    @Test void manualTopicsStayDistinctAndLinkedTopicsAreReused() throws Exception {
        var request = new CreateTopic(null, "Example", "Analyst", "https://example.com/jobs/local");
        assertThat(discussions.create(request).topicId()).isNotEqualTo(discussions.create(request).topicId());
        postJson("/api/v1/discussions", new CreateTopic(job.jobKey(), "Google", "Graduate Software Engineer", job.sourceUrl()))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.topicId").value(topicId));
        postJson("/api/v1/discussions", new CreateTopic(null, "", "Title", null)).andExpect(status().isBadRequest());
        postJson("/api/v1/discussions", new CreateTopic(null, "Example", "Title", "javascript:alert(1)"))
            .andExpect(status().isBadRequest());
    }
    @Test void importsAreIdempotentAndUpdatesPreserveTopicAndComments() throws Exception {
        postJson("/api/v1/jobs/import", List.of(job)).andExpect(status().isOk()).andExpect(jsonPath("$.skipped").value(1));
        postJson("/api/v1/jobs/import", List.of(job(job.jobKey(), "Updated title")))
            .andExpect(jsonPath("$.updated").value(1));
        assertThat(topics.count()).isEqualTo(1);
        assertThat(discussions.byJob(job.jobKey()).topicId()).isEqualTo(topicId);
        assertThat(discussions.byJob(job.jobKey()).title()).isEqualTo("Updated title");
        assertThat(comments.countByTopicId(topicId)).isEqualTo(6);
        postJson("/api/v1/jobs/import", List.of(job("job_demo_new", "New")))
            .andExpect(jsonPath("$.imported").value(1));
    }
    @Test void malformedImportIsAtomic() throws Exception {
        String invalid = "[{\"jobKey\":\"bad\"}]";
        var valid = mapper.valueToTree(job("job_demo_valid", "Valid"));
        var array = mapper.createArrayNode().add(valid).add(mapper.readTree(invalid).get(0));
        postJson("/api/v1/jobs/import", array).andExpect(status().isBadRequest());
        assertThat(jobs.existsById("job_demo_valid")).isFalse();
        assertThat(topics.count()).isEqualTo(1);
        mvc.perform(post("/api/v1/jobs/import").contentType(MediaType.APPLICATION_JSON).content("[null]"))
            .andExpect(status().isBadRequest());
    }
    @Test void successfulConfirmationPersistsEntitlementAndAllowsPaging() throws Exception {
        Session s = checkout(); paid(s);
        postJson("/api/v1/payments/confirm", new ConfirmRequest(s.getId()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.paid").value(true)).andExpect(jsonPath("$.topicId").value(topicId));
        mvc.perform(get("/api/v1/payments/entitlement").param("topicId", topicId)).andExpect(jsonPath("$.unlocked").value(true));
        mvc.perform(get("/api/v1/discussions/" + topicId + "/comments").param("page", "1").param("size", "3"))
            .andExpect(jsonPath("$.items.length()").value(3)).andExpect(jsonPath("$.items[0].body").value("Comment 3"))
            .andExpect(jsonPath("$.unlocked").value(true)).andExpect(jsonPath("$.hasMore").value(false));
        assertThat(orders.findByStripeSessionId(s.getId()).orElseThrow().getStatus()).isEqualTo(CheckoutOrder.Status.PAID);
        // Subsequent API calls read the committed entitlement from the database.
        assertThat(entitlements.countByUserIdAndTopicId(DemoIdentity.USER_ID, topicId)).isEqualTo(1);
        postJson("/api/v1/payments/checkout", new CheckoutRequest(topicId)).andExpect(status().isConflict());
        mvc.perform(get("/api/v1/discussions/" + topicId + "/comments").param("size", "101")).andExpect(status().isBadRequest());
    }
    @Test void repeatedConfirmationIsIdempotentButStillChecksStripe() {
        Session s = checkout(); paid(s);
        payments.confirm(s.getId()); payments.confirm(s.getId());
        assertThat(entitlements.countByUserIdAndTopicId(DemoIdentity.USER_ID, topicId)).isEqualTo(1);
        assertThat(stripe.retrieves.get()).isEqualTo(2);
    }
    @Test void concurrentConfirmationsForDifferentSessionsGrantOneEntitlement() throws Exception {
        Session a = checkout(), b = checkout(); paid(a); paid(b);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            var first = pool.submit(() -> { start.await(); return payments.confirm(a.getId()); });
            var second = pool.submit(() -> { start.await(); return payments.confirm(b.getId()); });
            start.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS).unlocked()).isTrue();
            assertThat(second.get(10, TimeUnit.SECONDS).unlocked()).isTrue();
        }
        assertThat(entitlements.countByUserIdAndTopicId(DemoIdentity.USER_ID, topicId)).isEqualTo(1);
    }
    @Test void entitlementOnlyUnlocksPurchasedTopic() {
        String other = discussions.create(new CreateTopic(null, "Other", "Role", null)).topicId();
        Session s = checkout(); paid(s); payments.confirm(s.getId());
        assertThat(payments.entitlement(other).unlocked()).isFalse();
    }
    @Test void canceledOrUnpaidSessionRemainsRestricted() throws Exception {
        Session s = checkout();
        postJson("/api/v1/payments/confirm", new ConfirmRequest(s.getId()))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("PAYMENT_NOT_COMPLETED"));
        s.setStatus("expired");
        postJson("/api/v1/payments/confirm", new ConfirmRequest(s.getId())).andExpect(status().isConflict());
        assertThat(entitlements.count()).isZero();
        assertThat(discussions.comments(topicId, 0, 100).items()).hasSize(3);
    }
    @ParameterizedTest @ValueSource(strings={"user", "client", "topic", "order", "amount", "subtotal", "currency", "live", "mode", "session", "metadata"})
    void mismatchedSessionsNeverGrantEntitlement(String field) throws Exception {
        Session s = checkout(); String id = s.getId(); paid(s);
        switch (field) {
            case "user" -> s.getMetadata().put("userId", "other-user");
            case "client" -> s.setClientReferenceId("other-user");
            case "topic" -> s.getMetadata().put("topicId", "other-topic");
            case "order" -> s.getMetadata().put("orderId", "other-order");
            case "amount" -> s.setAmountTotal(1L);
            case "subtotal" -> s.setAmountSubtotal(1L);
            case "currency" -> s.setCurrency("usd");
            case "live" -> s.setLivemode(true);
            case "mode" -> s.setMode("subscription");
            case "session" -> s.setId("cs_test_other");
            case "metadata" -> s.setMetadata(null);
        }
        postJson("/api/v1/payments/confirm", new ConfirmRequest(id)).andExpect(status().isConflict())
            .andExpect(jsonPath("$.error.code").value("PAYMENT_SESSION_INVALID"));
        assertThat(entitlements.count()).isZero();
        assertThat(orders.findByStripeSessionId(id).orElseThrow().getStatus()).isEqualTo(CheckoutOrder.Status.PENDING);
    }
    @Test void forgedAndLiveSessionIdsNeverCallStripe() throws Exception {
        for (String id : List.of("cs_test_forged", "cs_live_forged", "anything")) {
            postJson("/api/v1/payments/confirm", new ConfirmRequest(id)).andExpect(status().isConflict());
        }
        assertThat(stripe.retrieves.get()).isZero();
        assertThat(entitlements.count()).isZero();
    }
    @Test void thirdPartyFailuresDoNotUnlock() throws Exception {
        stripe.createFails = true;
        postJson("/api/v1/payments/checkout", new CheckoutRequest(topicId)).andExpect(status().isServiceUnavailable());
        assertThat(orders.count()).isZero();
        stripe.createFails = false;
        Session s = checkout(); paid(s); stripe.retrieveFails = true;
        postJson("/api/v1/payments/confirm", new ConfirmRequest(s.getId())).andExpect(status().isServiceUnavailable());
        assertThat(entitlements.count()).isZero();
    }
    @Test void malformedParametersAndJsonHaveStructuredErrors() throws Exception {
        mvc.perform(get("/api/v1/discussions/" + topicId + "/comments").param("page", "not-a-number"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
        mvc.perform(get("/api/v1/payments/entitlement")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/payments/confirm").contentType(MediaType.APPLICATION_JSON).content("{"))
            .andExpect(status().isBadRequest());
    }
    @Test void corsOnlyAllowsConfiguredFrontend() throws Exception {
        mvc.perform(options("/api/v1/discussions").header("Origin", "http://localhost:5175").header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5175"));
        mvc.perform(options("/api/v1/discussions").header("Origin", "https://other.example").header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden());
    }
}
