package com.bank.account.controller;

import com.bank.account.entity.Account;
import com.bank.account.service.AccountService;
import com.bank.common.dto.request.CreditRequest;
import com.bank.common.dto.request.DebitRequest;
import com.bank.common.dto.response.AccountResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Internal, service-to-service endpoints used by Transaction Service's saga steps.
 * In production these would sit behind network policy / mTLS restricting callers to
 * the internal cluster, not exposed via the public gateway.
 */
@RestController
@RequestMapping("/internal/accounts")
@RequiredArgsConstructor
public class InternalAccountController {

    private final AccountService accountService;

    @GetMapping("/{accountId}")
    public ResponseEntity<AccountResponse> getAccount(@PathVariable UUID accountId) {
        Account a = accountService.getAccount(accountId);
        return ResponseEntity.ok(new AccountResponse(
                a.getId(), a.getUserId(), a.getAccountNumber(), a.getAccountType(),
                a.getBalance(), a.getStatus(), a.getCreatedAt(), a.getCurrency()));
    }

    @PostMapping("/{accountId}/debit")
    public ResponseEntity<Void> debit(@PathVariable UUID accountId, @RequestBody DebitRequest req) {
        accountService.debit(accountId, req.amount());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{accountId}/credit")
    public ResponseEntity<Void> credit(@PathVariable UUID accountId, @RequestBody CreditRequest req) {
        accountService.credit(accountId, req.amount());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reverse-transfer")
    public ResponseEntity<Void> reverseTransfer(@RequestBody com.bank.common.dto.request.ReversalTransferRequest req) {
        accountService.reverseTransfer(req.debitedAccountId(), req.creditedAccountId(), req.amount(), req.referenceId());
        return ResponseEntity.ok().build();
    }
}
