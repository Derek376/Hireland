package com.hireland.community.service;
import com.hireland.community.entity.CheckoutOrder;
import com.stripe.model.checkout.Session;
public interface StripeGateway {
    Session createCheckout(CheckoutOrder order);
    Session retrieveCheckout(String sessionId);
}
