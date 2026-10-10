package com.hireland.community.entity;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
@Entity @Table(name="comments", indexes=@Index(name="idx_comments_topic_time", columnList="topic_id,created_at,id"))
public class CommentEntity {
    @Id private String id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="topic_id", nullable=false)
    private DiscussionTopic topic;
    @Column(nullable=false) private String userId;
    @Column(nullable=false, length=80) private String displayName;
    @Column(nullable=false, length=1000) private String body;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    private boolean synthetic;
    protected CommentEntity() {}
    public CommentEntity(DiscussionTopic topic, String userId, String displayName, String body, Instant createdAt, boolean synthetic) {
        this.id = "comment_" + UUID.randomUUID(); this.topic = topic; this.userId = userId;
        this.displayName = displayName; this.body = body; this.createdAt = createdAt; this.synthetic = synthetic;
    }
    public String getId() { return id; }
    public String getDisplayName() { return displayName; }
    public String getBody() { return body; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isSynthetic() { return synthetic; }
}
