package com.hireland.community.service;
import com.hireland.community.config.DemoIdentity;
import com.hireland.community.dto.ApiModels.*;
import com.hireland.community.entity.*;
import com.hireland.community.exception.ApiException;
import com.hireland.community.repository.*;
import java.time.Instant;
import java.util.Comparator;
import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @Transactional(readOnly=true)
public class DiscussionService {
    private final TopicRepository topics;
    private final CommentRepository comments;
    private final EntitlementRepository entitlements;
    public DiscussionService(TopicRepository topics, CommentRepository comments, EntitlementRepository entitlements) {
        this.topics = topics; this.comments = comments; this.entitlements = entitlements;
    }
    public DiscussionTopic requireTopic(String id) {
        return topics.findById(id).orElseThrow(() -> ApiException.notFound("Discussion topic not found."));
    }
    public Topic toDto(DiscussionTopic t) {
        return new Topic(t.getId(), t.getJobKey(), t.getCompany(), t.getTitle(), t.getSourceUrl(),
                comments.countByTopicId(t.getId()), t.isSynthetic(), DemoIdentity.DISCLAIMER);
    }
    public TopicList list(String query, String company) {
        String q = query.strip().toLowerCase(Locale.ROOT), c = company.strip().toLowerCase(Locale.ROOT);
        return new TopicList(topics.findAll().stream()
            .filter(t -> (t.getCompany() + " " + t.getTitle()).toLowerCase(Locale.ROOT).contains(q))
            .filter(t -> t.getCompany().toLowerCase(Locale.ROOT).contains(c))
            .sorted(Comparator.comparing(DiscussionTopic::getCompany).thenComparing(DiscussionTopic::getTitle).thenComparing(DiscussionTopic::getId))
            .map(this::toDto).toList(), DemoIdentity.DISCLAIMER);
    }
    public Topic byJob(String key) {
        return toDto(topics.findByJobKey(key).orElseThrow(() -> ApiException.notFound("Job has not been imported. Please create a local topic or import the job first.")));
    }
    public Topic get(String id) { return toDto(requireTopic(id)); }
    @Transactional public Topic create(CreateTopic request) {
        String key = request.jobKey();
        if (key != null && key.isBlank()) throw ApiException.validation("jobKey must be null or nonblank.");
        InputRules.httpUrl(request.sourceUrl(), true);
        if (key != null) {
            var existing = topics.findByJobKey(key);
            if (existing.isPresent()) return toDto(existing.get());
        }
        return toDto(topics.save(new DiscussionTopic(key, request.company().strip(), request.title().strip(), request.sourceUrl(), false)));
    }
    public Comments comments(String id, int page, int size) {
        requireTopic(id);
        long total = comments.countByTopicId(id);
        boolean unlocked = entitlements.existsByUserIdAndTopicId(DemoIdentity.USER_ID, id);
        if (!unlocked) {
            var preview = comments.findTop3ByTopicIdOrderByCreatedAtDescIdDesc(id).stream().map(this::commentDto).toList();
            return new Comments(preview, total, 3, false, total > preview.size(), 0, 3, DemoIdentity.DISCLAIMER);
        }
        if (page < 0 || size < 1 || size > 100) throw ApiException.validation("page must be >= 0 and size must be between 1 and 100.");
        var result = comments.findByTopicId(id, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        return new Comments(result.stream().map(this::commentDto).toList(), total, null, true,
                result.hasNext(), page, size, DemoIdentity.DISCLAIMER);
    }
    @Transactional public Comment addComment(String id, CreateComment request) {
        var entity = new CommentEntity(requireTopic(id), DemoIdentity.USER_ID, request.displayName().strip(), request.body().strip(), Instant.now(), false);
        return commentDto(comments.save(entity));
    }
    private Comment commentDto(CommentEntity c) {
        return new Comment(c.getId(), c.getDisplayName(), c.getBody(), c.getCreatedAt(), c.isSynthetic());
    }
}
