package com.hireland.community.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="entitlements", uniqueConstraints=@UniqueConstraint(columnNames={"user_id", "topic_id"}))
public class EntitlementEntity {
    @Id private String id;
    @Column(name="user_id", nullable=false) private String userId;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="topic_id", nullable=false) private DiscussionTopic topic;
    @Column(nullable=false) private Instant grantedAt;
    protected EntitlementEntity() {}
    public EntitlementEntity(String userId, DiscussionTopic topic) {
        id = "entitlement_" + UUID.randomUUID(); this.userId = userId; this.topic = topic; grantedAt = Instant.now();
    }
}
