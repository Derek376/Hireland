package com.hireland.community.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="checkout_orders", uniqueConstraints=@UniqueConstraint(columnNames="stripe_session_id"))
public class CheckoutOrder {
    @Id private String id;
    @Column(name="stripe_session_id", length=255) private String stripeSessionId;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="topic_id", nullable=false) private DiscussionTopic topic;
    @Column(nullable=false) private String userId;
    @Column(nullable=false) private int amountCents;
    @Column(nullable=false) private String currency;
    @Enumerated(EnumType.STRING) @Column(nullable=false) private Status status;
    @Column(nullable=false) private Instant createdAt;
    private Instant paidAt;
    public enum Status { PENDING, PAID }
    protected CheckoutOrder() {}
    public CheckoutOrder(DiscussionTopic topic, String userId, int amountCents, String currency) {
        this.id = "order_" + UUID.randomUUID(); this.topic = topic; this.userId = userId;
        this.amountCents = amountCents; this.currency = currency; this.status = Status.PENDING; this.createdAt = Instant.now();
    }
    public String getId() { return id; }
    public String getStripeSessionId() { return stripeSessionId; }
    public void setStripeSessionId(String value) { stripeSessionId = value; }
    public DiscussionTopic getTopic() { return topic; }
    public String getUserId() { return userId; }
    public int getAmountCents() { return amountCents; }
    public String getCurrency() { return currency; }
    public Status getStatus() { return status; }
    public void markPaid() { if (status != Status.PAID) { status = Status.PAID; paidAt = Instant.now(); } }
}
