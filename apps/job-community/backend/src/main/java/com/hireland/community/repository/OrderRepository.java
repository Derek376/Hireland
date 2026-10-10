package com.hireland.community.repository;
import com.hireland.community.entity.CheckoutOrder;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface OrderRepository extends JpaRepository<CheckoutOrder, String> {
    Optional<CheckoutOrder> findByStripeSessionId(String sessionId);
}
