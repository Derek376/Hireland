package com.hireland.community.exception;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);
    public record ErrorDetail(String code, String message, String requestId) {}
    public record ErrorResponse(ErrorDetail error) {}
    private ResponseEntity<ErrorResponse> response(int status, String code, String message, HttpServletRequest req) {
        return ResponseEntity.status(status).body(new ErrorResponse(new ErrorDetail(code, message, (String) req.getAttribute("requestId"))));
    }
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorResponse> api(ApiException e, HttpServletRequest req) {
        LOG.warn("requestId={} failure={}", req.getAttribute("requestId"), e.code());
        return response(e.status(), e.code(), e.getMessage(), req);
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class,
        HandlerMethodValidationException.class, HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    ResponseEntity<ErrorResponse> validation(Exception e, HttpServletRequest req) {
        return response(400, "VALIDATION_ERROR", "Invalid request: check required fields, field lengths and parameter types.", req);
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> conflict(Exception e, HttpServletRequest req) {
        return response(409, "CONFLICT", "A concurrent request changed this record. Please retry.", req);
    }
    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ErrorResponse> missing(Exception e, HttpServletRequest req) {
        return response(404, "NOT_FOUND", "API route not found.", req);
    }
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ErrorResponse> method(Exception e, HttpServletRequest req) {
        return response(405, "METHOD_NOT_ALLOWED", "HTTP method not supported.", req);
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> unexpected(Exception e, HttpServletRequest req) {
        LOG.error("requestId={} failureType={}", req.getAttribute("requestId"), e.getClass().getSimpleName());
        return response(500, "INTERNAL_ERROR", "An unexpected error occurred.", req);
    }
}
