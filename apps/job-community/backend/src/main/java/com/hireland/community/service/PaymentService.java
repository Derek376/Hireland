package com.hireland.community.service;
import com.hireland.community.config.DemoIdentity;
import com.hireland.community.dto.ApiModels.*;
import com.hireland.community.entity.*;
import com.hireland.community.exception.ApiException;
import com.hireland.community.repository.*;
import com.stripe.model.checkout.Session;
import java.net.URI;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class PaymentService {
    public static final int AMOUNT_CENTS = 99;
    public static final String CURRENCY = "eur";
    private static final Logger LOG = LoggerFactory.getLogger(PaymentService.class);
    private final TopicRepository topics;
    private final OrderRepository orders;
    private final EntitlementRepository entitlements;
    private final StripeGateway stripe;
    public PaymentService(TopicRepository topics, OrderRepository orders, EntitlementRepository entitlements, StripeGateway stripe) {
        this.topics = topics; this.orders = orders; this.entitlements = entitlements; this.stripe = stripe;
    }
    @Transactional(readOnly=true) public Entitlement entitlement(String topicId) {
        if (!topics.existsById(topicId)) throw ApiException.notFound("Discussion topic not found.");
        return new Entitlement(topicId, DemoIdentity.USER_ID, entitlements.existsByUserIdAndTopicId(DemoIdentity.USER_ID, topicId));
    }
    @Transactional public Checkout checkout(String topicId) {
        var topic = lockTopic(topicId);
        if (entitlements.existsByUserIdAndTopicId(DemoIdentity.USER_ID, topicId)) {
            throw new ApiException(409, "TOPIC_ALREADY_UNLOCKED", "This topic is already unlocked.");
        }
        var order = orders.saveAndFlush(new CheckoutOrder(topic, DemoIdentity.USER_ID, AMOUNT_CENTS, CURRENCY));
        Session session = stripe.createCheckout(order);
        validateIdentity(session, order, false);
        try {
            URI url = URI.create(session.getUrl());
            if (!"https".equals(url.getScheme()) || !"checkout.stripe.com".equals(url.getHost())) throw new IllegalArgumentException();
        } catch (IllegalArgumentException | NullPointerException e) {
            throw invalid("Stripe did not return a valid hosted Checkout URL.");
        }
        order.setStripeSessionId(session.getId());
        LOG.info("Checkout created for topic={}", topicId);
        return new Checkout(session.getUrl(), session.getId(), AMOUNT_CENTS, CURRENCY, topicId);
    }
    @Transactional public Confirmation confirm(String sessionId) {
        if (sessionId == null || !sessionId.startsWith("cs_test_")) throw invalid("A test-mode Checkout Session is required.");
        var order = orders.findByStripeSessionId(sessionId).orElseThrow(() -> invalid("Checkout session does not belong to a local order."));
        // Lock the topic, not only the order: two paid sessions for one topic must also grant exactly one entitlement.
        var topic = lockTopic(order.getTopic().getId());
        Session session = stripe.retrieveCheckout(sessionId);
        validateIdentity(session, order, true);
        if (!"paid".equals(session.getPaymentStatus()) || !"complete".equals(session.getStatus())) {
            throw new ApiException(409, "PAYMENT_NOT_COMPLETED", "Payment has not completed. This topic remains restricted.");
        }
        if (!entitlements.existsByUserIdAndTopicId(DemoIdentity.USER_ID, topic.getId())) {
            entitlements.saveAndFlush(new EntitlementEntity(DemoIdentity.USER_ID, topic));
        }
        order.markPaid();
        LOG.info("Payment verified for topic={}", topic.getId());
        return new Confirmation(true, topic.getId(), true);
    }
    private DiscussionTopic lockTopic(String topicId) {
        return topics.findLockedById(topicId).orElseThrow(() -> ApiException.notFound("Discussion topic not found."));
    }
    private void validateIdentity(Session session, CheckoutOrder order, boolean confirm) {
        if (session == null || session.getId() == null || !session.getId().startsWith("cs_test_")
                || !Boolean.FALSE.equals(session.getLivemode()) || !"payment".equals(session.getMode())
                || !Objects.equals(session.getClientReferenceId(), DemoIdentity.USER_ID)
                || !Objects.equals(order.getUserId(), DemoIdentity.USER_ID)
                || session.getMetadata() == null
                || !Objects.equals(session.getMetadata().get("userId"), order.getUserId())
                || !Objects.equals(session.getMetadata().get("topicId"), order.getTopic().getId())
                || !Objects.equals(session.getMetadata().get("orderId"), order.getId())
                || (confirm && !Objects.equals(session.getId(), order.getStripeSessionId()))
                || !Objects.equals(session.getAmountTotal(), (long) order.getAmountCents())
                || !Objects.equals(session.getAmountSubtotal(), (long) AMOUNT_CENTS)
                || order.getAmountCents() != AMOUNT_CENTS
                || !CURRENCY.equals(order.getCurrency()) || !CURRENCY.equals(session.getCurrency())) {
            throw invalid("Checkout session ownership, test mode or price does not match the local order.");
        }
    }
    private ApiException invalid(String message) { return new ApiException(409, "PAYMENT_SESSION_INVALID", message); }
}
