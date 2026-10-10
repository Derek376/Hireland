package com.hireland.community.controller;
import com.hireland.community.dto.ApiModels.ImportResult;
import com.hireland.community.dto.JobSnapshot;
import com.hireland.community.service.JobImportService;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/jobs")
public class JobImportController {
    private final JobImportService service;
    public JobImportController(JobImportService service) { this.service = service; }
    @PostMapping("/import") public ImportResult importJobs(@RequestBody List<JobSnapshot> jobs) { return service.importJobs(jobs); }
}
