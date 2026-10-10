package com.hireland.community.repository;
import com.hireland.community.entity.CommentEntity;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CommentRepository extends JpaRepository<CommentEntity, String> {
    long countByTopicId(String topicId);
    List<CommentEntity> findTop3ByTopicIdOrderByCreatedAtDescIdDesc(String topicId);
    Page<CommentEntity> findByTopicId(String topicId, Pageable pageable);
}
