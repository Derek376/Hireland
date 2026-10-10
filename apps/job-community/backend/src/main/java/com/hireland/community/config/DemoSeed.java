package com.hireland.community.config;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hireland.community.dto.JobSnapshot;
import com.hireland.community.entity.CommentEntity;
import com.hireland.community.repository.*;
import com.hireland.community.service.JobImportService;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component @ConditionalOnProperty(name="community.seed-enabled", havingValue="true", matchIfMissing=true)
public class DemoSeed implements ApplicationRunner {
    private final JobImportService importer;
    private final TopicRepository topics;
    private final CommentRepository comments;
    private final JobSnapshotRepository snapshots;
    private final ObjectMapper mapper;
    public DemoSeed(JobImportService importer, TopicRepository topics, CommentRepository comments, JobSnapshotRepository snapshots, ObjectMapper mapper) {
        this.importer = importer; this.topics = topics; this.comments = comments; this.snapshots = snapshots; this.mapper = mapper;
    }
    @Override @Transactional public void run(ApplicationArguments args) throws Exception {
        List<JobSnapshot> jobs;
        try (var input = new ClassPathResource("demo-jobs.json").getInputStream()) {
            jobs = mapper.readValue(input, new TypeReference<List<JobSnapshot>>() {});
        }
        // Existing snapshots are never overwritten on restart.
        importer.importJobs(jobs.stream().filter(j -> !snapshots.existsById(j.jobKey())).toList());
        seedComments("job_demo_google_grad_swe_001", 6);
        seedComments("job_demo_microsoft_grad_swe_001", 2);
    }
    private void seedComments(String key, int count) {
        var topic = topics.findByJobKey(key).orElseThrow();
        if (comments.countByTopicId(topic.getId()) != 0) return;
        String[] bodies = {
            "Synthetic demo: I submitted an application this week.",
            "Synthetic demo: I received an example online assessment invitation.",
            "Synthetic demo: I am practising data structures for an example interview.",
            "Synthetic demo: My example application is still under review.",
            "Synthetic demo: I received an example technical interview invitation.",
            "Synthetic demo: I shared an example application timeline. This is not real hiring information."
        };
        for (int i = 0; i < count; i++) comments.save(new CommentEntity(topic, "demo-author-" + i,
            "Demo Student " + (i + 1), bodies[i], Instant.parse("2026-10-10T09:00:00Z").plusSeconds(i * 60L), true));
    }
}
