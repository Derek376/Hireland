package com.hireland.community.repository;
import com.hireland.community.entity.DiscussionTopic;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
public interface TopicRepository extends JpaRepository<DiscussionTopic, String> {
    Optional<DiscussionTopic> findByJobKey(String jobKey);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from DiscussionTopic t where t.id = :id")
    Optional<DiscussionTopic> findLockedById(@Param("id") String id);
}
