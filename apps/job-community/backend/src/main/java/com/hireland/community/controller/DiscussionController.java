package com.hireland.community.controller;
import com.hireland.community.dto.ApiModels.*;
import com.hireland.community.service.DiscussionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/discussions")
public class DiscussionController {
    private final DiscussionService service;
    public DiscussionController(DiscussionService service) { this.service = service; }
    @GetMapping public TopicList list(@RequestParam(defaultValue="") String query, @RequestParam(defaultValue="") String company) {
        return service.list(query, company);
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Topic create(@Valid @RequestBody CreateTopic request) { return service.create(request); }
    @GetMapping("/by-job/{jobKey}") public Topic byJob(@PathVariable String jobKey) { return service.byJob(jobKey); }
    @GetMapping("/{topicId}") public Topic get(@PathVariable String topicId) { return service.get(topicId); }
    @GetMapping("/{topicId}/comments") public Comments comments(@PathVariable String topicId,
            @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
        return service.comments(topicId, page, size);
    }
    @PostMapping("/{topicId}/comments") @ResponseStatus(HttpStatus.CREATED)
    public Comment addComment(@PathVariable String topicId, @Valid @RequestBody CreateComment request) { return service.addComment(topicId, request); }
}
