package com.hireland.community.service;
import com.hireland.community.entity.CheckoutOrder;
import com.hireland.community.exception.ApiException;
import com.stripe.exception.*;
import com.stripe.model.Price;
import com.stripe.model.checkout.Session;
import com.stripe.net.RequestOptions;
import com.stripe.param.checkout.SessionCreateParams;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component
public class StripeSdkGateway implements StripeGateway {
    private final String secretKey;
    private final String priceId;
    private final String successUrl;
    private final String cancelUrl;
    public StripeSdkGateway(@Value("${stripe.secret-key}") String secretKey, @Value("${stripe.price-id}") String priceId,
            @Value("${stripe.success-url}") String successUrl, @Value("${stripe.cancel-url}") String cancelUrl) {
        this.secretKey = secretKey; this.priceId = priceId; this.successUrl = successUrl; this.cancelUrl = cancelUrl;
    }
    private RequestOptions options(String idempotencyKey) {
        if (!secretKey.startsWith("sk_test_") || secretKey.equals("sk_test_replace_with_your_test_key")) {
            throw configuration("Configure a valid Stripe test-mode secret key on the backend.");
        }
        return RequestOptions.builder().setApiKey(secretKey).setConnectTimeout(10000).setReadTimeout(20000)
            .setMaxNetworkRetries(1).setIdempotencyKey(idempotencyKey).build();
    }
    @Override public Session createCheckout(CheckoutOrder order) {
        try {
            InputRules.httpUrl(successUrl.replace("{CHECKOUT_SESSION_ID}", "cs_test_placeholder"), false);
            InputRules.httpUrl(cancelUrl, false);
        } catch (ApiException e) { throw configuration("Stripe redirect URLs must be valid HTTP or HTTPS URLs."); }
        if (!successUrl.contains("{CHECKOUT_SESSION_ID}")) throw configuration("STRIPE_SUCCESS_URL must contain {CHECKOUT_SESSION_ID}.");
        RequestOptions requestOptions = options(order.getId());
        try {
            var line = SessionCreateParams.LineItem.builder().setQuantity(1L);
            if (!priceId.isBlank()) {
                Price price = Price.retrieve(priceId, options(null));
                if (!Boolean.FALSE.equals(price.getLivemode()) || !Boolean.TRUE.equals(price.getActive())
                        || !Objects.equals(price.getUnitAmount(), 99L) || !"eur".equals(price.getCurrency())
                        || price.getRecurring() != null || !"one_time".equals(price.getType())) {
                    throw configuration("STRIPE_PRICE_ID must be an active test-mode, one-time EUR 0.99 price.");
                }
                line.setPrice(priceId);
            } else {
                line.setPriceData(SessionCreateParams.LineItem.PriceData.builder().setCurrency("eur").setUnitAmount(99L)
                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("Unlock discussion: " + order.getTopic().getCompany() + " — " + order.getTopic().getTitle())
                        .setDescription("One-time unlock for this topic. Sandbox purchase only; community reports are unverified.")
                        .build()).build());
            }
            var params = SessionCreateParams.builder().setMode(SessionCreateParams.Mode.PAYMENT)
                .addAllowedPaymentMethodType(SessionCreateParams.AllowedPaymentMethodType.CARD)
                .setAllowPromotionCodes(false)
                .setAdaptivePricing(SessionCreateParams.AdaptivePricing.builder().setEnabled(false).build())
                .setAutomaticTax(SessionCreateParams.AutomaticTax.builder().setEnabled(false).build())
                .setClientReferenceId(order.getUserId())
                .putMetadata("userId", order.getUserId()).putMetadata("topicId", order.getTopic().getId())
                .putMetadata("orderId", order.getId())
                .setSuccessUrl(successUrl).setCancelUrl(cancelUrl).addLineItem(line.build()).build();
            return Session.create(params, requestOptions);
        } catch (AuthenticationException | InvalidRequestException e) {
            throw configuration("Stripe rejected the test-mode configuration. Check the backend key, price and redirect URLs.");
        } catch (StripeException e) {
            throw new ApiException(503, "PAYMENT_UNAVAILABLE", "Stripe is temporarily unavailable. Please retry.");
        }
    }
    @Override public Session retrieveCheckout(String sessionId) {
        try { return Session.retrieve(sessionId, options(null)); }
        catch (InvalidRequestException e) { throw new ApiException(409, "PAYMENT_SESSION_INVALID", "Stripe could not find this checkout session."); }
        catch (AuthenticationException e) { throw configuration("Stripe rejected the backend test-mode key."); }
        catch (StripeException e) { throw new ApiException(503, "PAYMENT_UNAVAILABLE", "Unable to verify payment with Stripe. Please retry."); }
    }
    private ApiException configuration(String message) { return new ApiException(503, "PAYMENT_CONFIGURATION_ERROR", message); }
}
