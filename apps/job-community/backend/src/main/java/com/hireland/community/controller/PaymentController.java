package com.hireland.community.controller;
import com.hireland.community.dto.ApiModels.*;
import com.hireland.community.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/payments")
public class PaymentController {
    private final PaymentService service;
    public PaymentController(PaymentService service) { this.service = service; }
    @GetMapping("/entitlement") public Entitlement entitlement(@RequestParam String topicId) { return service.entitlement(topicId); }
    @PostMapping("/checkout") public Checkout checkout(@Valid @RequestBody CheckoutRequest request) { return service.checkout(request.topicId()); }
    @PostMapping("/confirm") public Confirmation confirm(@Valid @RequestBody ConfirmRequest request) { return service.confirm(request.sessionId()); }
}
