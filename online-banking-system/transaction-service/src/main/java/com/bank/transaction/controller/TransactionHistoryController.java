package com.bank.transaction.controller;

import com.bank.common.dto.response.TransactionResponse;
import com.bank.common.exceptions.TransactionNotFoundException;
import com.bank.transaction.entity.Transaction;
import com.bank.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
public class TransactionHistoryController {

    private final TransactionRepository txnRepo;

    @GetMapping(value = {"/account/{accountId}", "/transfers/account/{accountId}"})
    public ResponseEntity<Page<TransactionResponse>> history(
            @PathVariable("accountId") UUID accountId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        Page<Transaction> txns = txnRepo.findByFromAccountIdOrToAccountId(
                accountId, accountId, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(txns.map(this::toDto));
    }

    @GetMapping
    public ResponseEntity<Page<TransactionResponse>> listAll(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        Page<Transaction> txns;
        if (status != null && !status.isBlank()) {
            txns = txnRepo.findByStatus(status.toUpperCase(), PageRequest.of(page, size, Sort.by("createdAt").descending()));
        } else {
            txns = txnRepo.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
        }
        return ResponseEntity.ok(txns.map(this::toDto));
    }

    @GetMapping(value = {"/{transactionId}", "/transfers/{transactionId}"})
    public ResponseEntity<TransactionResponse> get(@PathVariable("transactionId") UUID transactionId) {
        Transaction txn = txnRepo.findById(transactionId)
                .orElseThrow(() -> new TransactionNotFoundException(transactionId));
        return ResponseEntity.ok(toDto(txn));
    }

    private TransactionResponse toDto(Transaction t) {
        return new TransactionResponse(
                t.getId(), t.getFromAccountId(), t.getToAccountId(), t.getAmount(),
                t.getStatus(), t.getFailureReason(), t.getRiskFlag(), t.getCreatedAt());
    }
}
