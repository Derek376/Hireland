package com.hireland.community.dto;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
public final class ApiModels {
    private ApiModels() {}
    public record CreateTopic(@Size(max=200) String jobKey, @NotBlank @Size(max=200) String company,
            @NotBlank @Size(max=300) String title, @Size(max=2048) String sourceUrl) {}
    public record CreateComment(@NotBlank @Size(max=80) String displayName, @NotBlank @Size(max=1000) String body) {}
    public record CheckoutRequest(@NotBlank @Size(max=200) String topicId) {}
    public record ConfirmRequest(@NotBlank @Size(max=255) String sessionId) {}
    public record Topic(String topicId, String jobKey, String company, String title, String sourceUrl,
            long commentCount, boolean synthetic, String disclaimer) {}
    public record TopicList(List<Topic> items, String disclaimer) {}
    public record Comment(String id, String displayName, String body, Instant createdAt, boolean synthetic) {}
    public record Comments(List<Comment> items, long total, Integer visibleLimit, boolean unlocked,
            boolean hasMore, int page, int size, String disclaimer) {}
    public record ImportResult(int imported, int updated, int skipped) {}
    public record Entitlement(String topicId, String userId, boolean unlocked) {}
    public record Checkout(String checkoutUrl, String sessionId, int amountCents, String currency, String topicId) {}
    public record Confirmation(boolean paid, String topicId, boolean unlocked) {}
}
