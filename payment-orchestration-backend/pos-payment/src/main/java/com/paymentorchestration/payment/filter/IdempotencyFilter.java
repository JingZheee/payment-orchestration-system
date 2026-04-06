package com.paymentorchestration.payment.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.paymentorchestration.common.exception.IdempotencyConflictException;
import com.paymentorchestration.domain.entity.IdempotencyRecord;
import com.paymentorchestration.domain.repository.IdempotencyRecordRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Intercepts POST /api/v1/payments/initiate to enforce idempotency.
 *
 * Flow:
 *   1. If Idempotency-Key header is absent — pass through (controller rejects it with 400).
 *   2. Hash the raw request body with SHA-256.
 *   3. Look up the key in idempotency_records:
 *      a. Found + hash matches → replay the cached response (HTTP 200).
 *      b. Found + hash differs → 422 IdempotencyConflictException.
 *      c. Not found → wrap the response, let the request through, then save the record.
 *
 * Request bodies are cached so Spring MVC can still read them after the filter reads them.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class IdempotencyFilter extends OncePerRequestFilter {

    public static final String IDEMPOTENCY_HEADER = "Idempotency-Key";
    private static final String PROTECTED_PATH = "/api/v1/payments/initiate";
    /** Idempotency records are valid for 24 hours. */
    private static final long EXPIRY_HOURS = 24;

    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equalsIgnoreCase(request.getMethod())
                || !request.getRequestURI().endsWith(PROTECTED_PATH);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String key = request.getHeader(IDEMPOTENCY_HEADER);
        if (key == null || key.isBlank()) {
            // No key supplied — let through; controller will validate it as @NotBlank
            filterChain.doFilter(request, response);
            return;
        }

        // Cache the request body so it can be read again by Jackson / the controller
        CachedBodyRequestWrapper cachedRequest = new CachedBodyRequestWrapper(request);
        String bodyHash = sha256Hex(cachedRequest.getBodyBytes());

        Optional<IdempotencyRecord> existing =
                idempotencyRecordRepository.findByIdempotencyKey(key);

        if (existing.isPresent()) {
            IdempotencyRecord record = existing.get();

            if (Instant.now().isAfter(record.getExpiresAt())) {
                // Expired record — treat as new
                idempotencyRecordRepository.delete(record);
            } else if (!record.getRequestHash().equals(bodyHash)) {
                throw new IdempotencyConflictException(
                        "Idempotency-Key '" + key + "' was already used with a different request body.");
            } else {
                // Exact replay — return cached response
                log.debug("[idempotency] cache hit for key={}", key);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                PrintWriter writer = response.getWriter();
                writer.write(record.getResponseBody());
                writer.flush();
                return;
            }
        }

        // New key — wrap response to capture body, then save record
        ContentCachingResponseWrapper cachedResponse = new ContentCachingResponseWrapper(response);
        filterChain.doFilter(cachedRequest, cachedResponse);

        byte[] responseBytes = cachedResponse.getContentAsByteArray();
        String responseBody = new String(responseBytes, StandardCharsets.UTF_8);

        IdempotencyRecord record = new IdempotencyRecord();
        record.setIdempotencyKey(key);
        record.setRequestHash(bodyHash);
        record.setResponseBody(responseBody);
        record.setExpiresAt(Instant.now().plusSeconds(EXPIRY_HOURS * 3600));
        idempotencyRecordRepository.save(record);

        log.debug("[idempotency] saved record for key={}", key);
        cachedResponse.copyBodyToResponse();
    }

    private static String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    // -------------------------------------------------------------------------
    // Inner class: request wrapper that caches the body for re-reading
    // -------------------------------------------------------------------------

    static class CachedBodyRequestWrapper extends jakarta.servlet.http.HttpServletRequestWrapper {

        private final byte[] body;

        CachedBodyRequestWrapper(HttpServletRequest request) throws IOException {
            super(request);
            body = request.getInputStream().readAllBytes();
        }

        byte[] getBodyBytes() {
            return body;
        }

        @Override
        public jakarta.servlet.ServletInputStream getInputStream() {
            ByteArrayInputStream stream = new ByteArrayInputStream(body);
            return new jakarta.servlet.ServletInputStream() {
                @Override public int read() { return stream.read(); }
                @Override public boolean isFinished() { return stream.available() == 0; }
                @Override public boolean isReady() { return true; }
                @Override public void setReadListener(jakarta.servlet.ReadListener l) {}
            };
        }

        @Override
        public java.io.BufferedReader getReader() {
            return new java.io.BufferedReader(
                    new java.io.InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
