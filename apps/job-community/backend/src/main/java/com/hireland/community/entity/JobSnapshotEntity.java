package com.hireland.community.entity;
import jakarta.persistence.*;
@Entity @Table(name="job_snapshots")
public class JobSnapshotEntity {
    @Id @Column(length=200) private String jobKey;
    @Lob @Column(nullable=false) private String snapshotJson;
    protected JobSnapshotEntity() {}
    public JobSnapshotEntity(String jobKey, String snapshotJson) { this.jobKey = jobKey; this.snapshotJson = snapshotJson; }
    public String getSnapshotJson() { return snapshotJson; }
    public void setSnapshotJson(String value) { snapshotJson = value; }
}
