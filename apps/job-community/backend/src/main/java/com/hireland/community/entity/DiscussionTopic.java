package com.hireland.community.entity;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="discussion_topics", uniqueConstraints=@UniqueConstraint(columnNames="job_key"))
public class DiscussionTopic {
    @Id @Column(length=200) private String id;
    @Column(name="job_key", length=200) private String jobKey;
    @Column(nullable=false, length=200) private String company;
    @Column(nullable=false, length=300) private String title;
    @Column(length=2048) private String sourceUrl;
    private boolean synthetic;
    protected DiscussionTopic() {}
    public DiscussionTopic(String jobKey, String company, String title, String sourceUrl, boolean synthetic) {
        this.id = "topic_" + UUID.randomUUID(); this.jobKey = jobKey;
        update(company, title, sourceUrl, synthetic);
    }
    public void update(String company, String title, String sourceUrl, boolean synthetic) {
        this.company = company; this.title = title; this.sourceUrl = sourceUrl; this.synthetic = synthetic;
    }
    public String getId() { return id; }
    public String getJobKey() { return jobKey; }
    public String getCompany() { return company; }
    public String getTitle() { return title; }
    public String getSourceUrl() { return sourceUrl; }
    public boolean isSynthetic() { return synthetic; }
}
