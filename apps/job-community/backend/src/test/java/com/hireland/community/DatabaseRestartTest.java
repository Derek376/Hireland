package com.hireland.community;

import com.hireland.community.dto.ApiModels.CreateComment;
import com.hireland.community.dto.ApiModels.CreateTopic;
import com.hireland.community.service.DiscussionService;
import com.hireland.community.service.PaymentService;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import static org.assertj.core.api.Assertions.assertThat;

class DatabaseRestartTest {
    @TempDir Path directory;

    private ConfigurableApplicationContext start() {
        return new SpringApplicationBuilder(CommunityApplication.class, ApiIntegrationTest.StubConfiguration.class)
            .web(WebApplicationType.NONE)
            .run("--spring.datasource.url=jdbc:h2:file:" + directory.resolve("community"),
                "--community.seed-enabled=false", "--spring.main.banner-mode=off");
    }

    @Test void verifiedEntitlementAndCommentsSurviveApplicationRestart() {
        String topicId;
        try (var first = start()) {
            var discussions = first.getBean(DiscussionService.class);
            var payments = first.getBean(PaymentService.class);
            var stripe = first.getBean(ApiIntegrationTest.StubStripeGateway.class);
            topicId = discussions.create(new CreateTopic(null, "Example", "Restart test", null)).topicId();
            for (int i = 0; i < 6; i++) {
                discussions.addComment(topicId, new CreateComment("Demo student", "Comment " + i));
            }
            assertThat(discussions.comments(topicId, 0, 20).items()).hasSize(3);
            String sessionId = payments.checkout(topicId).sessionId();
            var session = stripe.sessions.get(sessionId);
            session.setPaymentStatus("paid");
            session.setStatus("complete");
            payments.confirm(sessionId);
        }
        // A fresh application context and H2 connection; no entitlement is held in memory.
        try (var second = start()) {
            assertThat(second.getBean(PaymentService.class).entitlement(topicId).unlocked()).isTrue();
            var result = second.getBean(DiscussionService.class).comments(topicId, 0, 20);
            assertThat(result.unlocked()).isTrue();
            assertThat(result.items()).hasSize(6);
        }
    }
}
