package com.bank.common.exceptions;

import com.bank.common.dto.response.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.Instant;

/**
 * Shared exception -> HTTP mapping. Each service's own @RestControllerAdvice
 * (if it needs extra handlers) can extend or coexist with this one.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccountNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException ex, WebRequest req) {
        return build(HttpStatus.NOT_FOUND, ex, req);
    }

    @ExceptionHandler(TransactionNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTransactionNotFound(RuntimeException ex, WebRequest req) {
        return build(HttpStatus.NOT_FOUND, ex, req);
    }

    @ExceptionHandler(InsufficientFundsException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientFunds(RuntimeException ex, WebRequest req) {
        return build(HttpStatus.UNPROCESSABLE_ENTITY, ex, req);
    }

    @ExceptionHandler(AccountClosedException.class)
    public ResponseEntity<ErrorResponse> handleAccountClosed(RuntimeException ex, WebRequest req) {
        return build(HttpStatus.CONFLICT, ex, req);
    }

    @ExceptionHandler(TransferBlockedException.class)
    public ResponseEntity<ErrorResponse> handleBlocked(RuntimeException ex, WebRequest req) {
        return build(HttpStatus.FORBIDDEN, ex, req);
    }

    @ExceptionHandler(InvalidOtpException.class)
    public ResponseEntity<ErrorResponse> handleInvalidOtp(RuntimeException ex, WebRequest req) {
        return build(HttpStatus.UNAUTHORIZED, ex, req);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(RuntimeException ex, WebRequest req) {
        return build(HttpStatus.UNAUTHORIZED, ex, req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, WebRequest req) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        return build(HttpStatus.BAD_REQUEST, new RuntimeException(message), req);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex, WebRequest req) {
        return build(HttpStatus.FORBIDDEN, ex, req);
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(org.springframework.security.core.AuthenticationException ex, WebRequest req) {
        return build(HttpStatus.UNAUTHORIZED, ex, req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex, WebRequest req) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ex, req);
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, Exception ex, WebRequest req) {
        ErrorResponse body = new ErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                ex.getMessage(),
                req.getDescription(false).replace("uri=", "")
        );
        return ResponseEntity.status(status).body(body);
    }
}
