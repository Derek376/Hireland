package com.hireland.community.repository;
import com.hireland.community.entity.EntitlementEntity;
import org.springframework.data.jpa.repository.JpaRepository;
public interface EntitlementRepository extends JpaRepository<EntitlementEntity, String> {
    boolean existsByUserIdAndTopicId(String userId, String topicId);
    long countByUserIdAndTopicId(String userId, String topicId);
}
