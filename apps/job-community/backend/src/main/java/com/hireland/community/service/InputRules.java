package com.hireland.community.service;
import com.hireland.community.exception.ApiException;
import java.net.URI;
public final class InputRules {
    private InputRules() {}
    public static void httpUrl(String value, boolean allowEmpty) {
        if (value == null || value.isBlank()) {
            if (allowEmpty) return;
            throw ApiException.validation("sourceUrl is required.");
        }
        try {
            URI uri = URI.create(value);
            if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    || uri.getHost() == null || uri.getUserInfo() != null) throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) { throw ApiException.validation("sourceUrl must be an HTTP or HTTPS URL."); }
    }
}
