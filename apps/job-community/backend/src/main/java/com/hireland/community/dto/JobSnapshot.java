package com.hireland.community.dto;
import jakarta.validation.constraints.*;
import java.time.Instant;
public record JobSnapshot(
        @NotBlank @Size(max=200) String jobKey,
        @NotBlank @Size(max=200) String company,
        @NotBlank @Size(max=300) String title,
        @Size(max=200) String location,
        @NotNull Category category,
        @NotBlank @Size(max=100000) String description,
        @NotBlank @Size(max=100) String source,
        @NotNull @Size(max=2048) String sourceUrl,
        Instant postedAt,
        @NotNull Instant firstSeenAt,
        @NotNull Instant lastCheckedAt,
        @NotNull Status status,
        @NotNull Boolean synthetic) {
    public enum Category { TECH, FINANCE, CONSULTING, OTHER }
    public enum Status { OPEN, CLOSED, UNKNOWN }
}
