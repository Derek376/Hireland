package com.hireland.community;
import com.hireland.community.config.DemoSeed;
import com.hireland.community.repository.*;
import com.hireland.community.service.DiscussionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:seed-tests;DB_CLOSE_DELAY=-1"})
class DemoSeedTest {
    @Autowired DemoSeed seed;
    @Autowired DiscussionService discussions;
    @Autowired TopicRepository topics;
    @Autowired CommentRepository comments;
    @Test void startupSeedsSyntheticCommentsAndRunningAgainDoesNotDuplicate() throws Exception {
        var topic = discussions.byJob("job_demo_google_grad_swe_001");
        assertThat(topic.commentCount()).isEqualTo(6);
        assertThat(topic.synthetic()).isTrue();
        var preview = discussions.comments(topic.topicId(), 1, 100);
        assertThat(preview.items()).hasSize(3).allMatch(c -> c.synthetic() && c.body().startsWith("Synthetic demo:"));
        long topicCount = topics.count(), commentCount = comments.count();
        seed.run(new DefaultApplicationArguments(new String[0]));
        assertThat(topics.count()).isEqualTo(topicCount);
        assertThat(comments.count()).isEqualTo(commentCount);
    }
}
