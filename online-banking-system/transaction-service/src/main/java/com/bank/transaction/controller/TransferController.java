package com.bank.transaction.controller;

import com.bank.common.dto.request.TransferRequest;
import com.bank.common.dto.response.TransactionResponse;
import com.bank.transaction.entity.Transaction;
import com.bank.transaction.saga.TransferSagaOrchestrator;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Entry point into the transfer saga. POST is the only mutating action here — the
 * heavy lifting (locking, fraud checks, outbox, compensation) lives in
 * {@link TransferSagaOrchestrator}. Client must supply a per-attempt idempotencyKey;
 * retrying the same key returns the original result instead of double-transferring.
 */
@RestController
@RequestMapping("/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferSagaOrchestrator sagaOrchestrator;
    private final com.bank.transaction.repository.TransactionRepository txnRepo;

    @PostMapping
    public ResponseEntity<TransactionResponse> initiate(@Valid @RequestBody TransferRequest request) {
        Transaction txn = sagaOrchestrator.initiateTransfer(request);
        HttpStatus status = "FAILED".equals(txn.getStatus()) ? HttpStatus.UNPROCESSABLE_ENTITY : HttpStatus.ACCEPTED;
        return ResponseEntity.status(status).body(toDto(txn));
    }

    @PostMapping("/{transactionId}/reverse")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'CUSTOMER')")
    public ResponseEntity<TransactionResponse> reverse(
            @PathVariable("transactionId") UUID transactionId,
            @RequestParam(name = "reason", required = false, defaultValue = "Reversal requested by user/admin") String reason) {
        Transaction txn = sagaOrchestrator.reverseTransfer(transactionId, reason);
        return ResponseEntity.ok(toDto(txn));
    }

    @GetMapping("/{transactionId}")
    public ResponseEntity<TransactionResponse> get(@PathVariable("transactionId") UUID transactionId) {
        Transaction txn = txnRepo.findById(transactionId)
                .orElseThrow(() -> new com.bank.common.exceptions.TransactionNotFoundException(transactionId));
        return ResponseEntity.ok(toDto(txn));
    }

    @GetMapping("/account/{accountId}")
    public ResponseEntity<org.springframework.data.domain.Page<TransactionResponse>> getByAccount(
            @PathVariable("accountId") UUID accountId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        org.springframework.data.domain.Page<Transaction> txns = txnRepo.findByFromAccountIdOrToAccountId(
                accountId, accountId, org.springframework.data.domain.PageRequest.of(page, size, org.springframework.data.domain.Sort.by("createdAt").descending()));
        return ResponseEntity.ok(txns.map(this::toDto));
    }

    private TransactionResponse toDto(Transaction t) {
        return new TransactionResponse(
                t.getId(), t.getFromAccountId(), t.getToAccountId(), t.getAmount(),
                t.getStatus(), t.getFailureReason(), t.getRiskFlag(), t.getCreatedAt(), t.getCurrency());
    }
}
