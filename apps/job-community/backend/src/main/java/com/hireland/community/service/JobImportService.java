package com.hireland.community.service;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hireland.community.dto.ApiModels.ImportResult;
import com.hireland.community.dto.JobSnapshot;
import com.hireland.community.entity.*;
import com.hireland.community.exception.ApiException;
import com.hireland.community.repository.*;
import jakarta.validation.Validator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class JobImportService {
    private final JobSnapshotRepository jobs;
    private final TopicRepository topics;
    private final ObjectMapper mapper;
    private final Validator validator;
    public JobImportService(JobSnapshotRepository jobs, TopicRepository topics, ObjectMapper mapper, Validator validator) {
        this.jobs = jobs; this.topics = topics; this.mapper = mapper; this.validator = validator;
    }
    @Transactional public ImportResult importJobs(List<JobSnapshot> input) {
        if (input == null || input.size() > 100) throw ApiException.validation("Import accepts at most 100 JobSnapshots.");
        // Validate the entire batch before mutating persistent data.
        for (JobSnapshot job : input) {
            if (job == null || !validator.validate(job).isEmpty()) throw ApiException.validation("Invalid JobSnapshot fields.");
            InputRules.httpUrl(job.sourceUrl(), "MANUAL".equals(job.source()));
            if ("SYNTHETIC".equals(job.source()) && !job.synthetic()) throw ApiException.validation("Synthetic jobs must be marked synthetic=true.");
        }
        int imported = 0, updated = 0, skipped = 0;
        for (JobSnapshot job : input) {
            String json = serialize(job);
            var stored = jobs.findById(job.jobKey());
            if (stored.isEmpty()) { jobs.save(new JobSnapshotEntity(job.jobKey(), json)); imported++; }
            else if (stored.get().getSnapshotJson().equals(json)) { skipped++; }
            else { stored.get().setSnapshotJson(json); updated++; }
            var topic = topics.findByJobKey(job.jobKey()).orElseGet(() ->
                topics.save(new DiscussionTopic(job.jobKey(), job.company(), job.title(), job.sourceUrl(), job.synthetic())));
            topic.update(job.company(), job.title(), job.sourceUrl(), job.synthetic());
        }
        return new ImportResult(imported, updated, skipped);
    }
    private String serialize(JobSnapshot job) {
        try { return mapper.writeValueAsString(job); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Could not serialize JobSnapshot.", e); }
    }
}
