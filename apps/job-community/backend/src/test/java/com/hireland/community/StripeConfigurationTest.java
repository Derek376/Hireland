package com.hireland.community;
import com.hireland.community.exception.ApiException;
import com.hireland.community.service.StripeSdkGateway;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.assertj.core.api.Assertions.*;
class StripeConfigurationTest {
    @ParameterizedTest @ValueSource(strings={"", "sk_live_example", "pk_test_example", "sk_test_replace_with_your_test_key"})
    void rejectsMissingLiveAndPublicKeysBeforeCallingStripe(String key) {
        var gateway = new StripeSdkGateway(key, "", "http://localhost:5175/payment/success?session_id={CHECKOUT_SESSION_ID}", "http://localhost:5175/payment/cancel");
        assertThatThrownBy(() -> gateway.retrieveCheckout("cs_test_example")).isInstanceOfSatisfying(ApiException.class, e -> {
            assertThat(e.code()).isEqualTo("PAYMENT_CONFIGURATION_ERROR");
            assertThat(e.status()).isEqualTo(503);
            if (!key.isEmpty()) assertThat(e.getMessage()).doesNotContain(key);
        });
    }
}
