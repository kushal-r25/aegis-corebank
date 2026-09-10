package com.bank.account.controller;

import com.bank.account.entity.Account;
import com.bank.account.service.AccountQueryService;
import com.bank.account.service.AccountService;
import com.bank.common.dto.request.CreateAccountRequest;
import com.bank.common.dto.response.AccountResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final AccountQueryService accountQueryService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    public ResponseEntity<AccountResponse> create(@Valid @RequestBody CreateAccountRequest req,
                                                  java.security.Principal principal) {
        UUID userId = req.userId();
        if (principal != null && !isAdmin()) {
            try {
                userId = UUID.fromString(principal.getName());
            } catch (IllegalArgumentException ignored) {}
        }
        Account account = accountService.createAccount(userId, req.accountType(), req.currency());
        return ResponseEntity.status(201).body(toDto(account));
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<AccountResponse> get(@PathVariable("accountId") UUID accountId, java.security.Principal principal) {
        Account account = accountService.getAccount(accountId);
        checkOwnership(account, principal);
        return ResponseEntity.ok(toDto(account));
    }

    @GetMapping
    public ResponseEntity<List<AccountResponse>> getAccounts(
            @RequestParam(name = "userId", required = false) UUID userId,
            java.security.Principal principal) {
        List<Account> accounts;
        if (userId != null && (isAdmin() || (principal != null && userId.toString().equals(principal.getName())))) {
            accounts = accountService.getAccountsForUser(userId);
        } else if (principal != null && principal.getName() != null) {
            try {
                UUID authUserId = UUID.fromString(principal.getName());
                accounts = accountService.getAccountsForUser(authUserId);
            } catch (IllegalArgumentException e) {
                accounts = isAdmin() ? accountService.getAllAccounts() : List.of();
            }
        } else {
            accounts = isAdmin() ? accountService.getAllAccounts() : List.of();
        }
        return ResponseEntity.ok(accounts.stream().map(this::toDto).toList());
    }

    @GetMapping("/{accountId}/balance")
    public ResponseEntity<java.math.BigDecimal> getBalance(@PathVariable("accountId") UUID accountId, java.security.Principal principal) {
        Account account = accountService.getAccount(accountId);
        checkOwnership(account, principal);
        return ResponseEntity.ok(accountQueryService.getBalance(accountId));
    }

    @PostMapping("/{accountId}/deposit")
    public ResponseEntity<AccountResponse> deposit(@PathVariable("accountId") UUID accountId,
                                                   @Valid @RequestBody com.bank.common.dto.request.DepositRequest req,
                                                   java.security.Principal principal) {
        Account account = accountService.getAccount(accountId);
        checkOwnership(account, principal);
        Account updated = accountService.deposit(accountId, req.amount(), req.description(), req.idempotencyKey());
        return ResponseEntity.ok(toDto(updated));
    }

    @PostMapping("/{accountId}/withdraw")
    public ResponseEntity<AccountResponse> withdraw(@PathVariable("accountId") UUID accountId,
                                                    @Valid @RequestBody com.bank.common.dto.request.WithdrawRequest req,
                                                    java.security.Principal principal) {
        Account account = accountService.getAccount(accountId);
        checkOwnership(account, principal);
        Account updated = accountService.withdraw(accountId, req.amount(), req.description(), req.idempotencyKey());
        return ResponseEntity.ok(toDto(updated));
    }

    @PostMapping("/{accountId}/freeze")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AccountResponse> freeze(@PathVariable("accountId") UUID accountId,
                                                  @RequestParam(name = "reason", required = false, defaultValue = "Manual freeze requested") String reason) {
        Account account = accountService.freezeAccount(accountId, reason);
        return ResponseEntity.ok(toDto(account));
    }

    @PostMapping("/{accountId}/unfreeze")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AccountResponse> unfreeze(@PathVariable("accountId") UUID accountId) {
        Account account = accountService.unfreezeAccount(accountId);
        return ResponseEntity.ok(toDto(account));
    }

    @GetMapping("/{accountId}/ledger")
    public ResponseEntity<List<com.bank.account.dto.LedgerEntryResponse>> getLedger(@PathVariable("accountId") UUID accountId,
                                                                                    java.security.Principal principal) {
        Account account = accountService.getAccount(accountId);
        checkOwnershipOrAuditor(account, principal);
        List<com.bank.account.dto.LedgerEntryResponse> list = accountService.getLedger(accountId).stream()
                .map(l -> new com.bank.account.dto.LedgerEntryResponse(
                        l.getId(), l.getAccountId(), l.getAmount(), l.getEntryType(),
                        l.getBalanceAfter(), l.getReferenceId(), l.getDescription(), l.getCreatedAt(), l.getCurrency()))
                .toList();
        return ResponseEntity.ok(list);
    }

    @PostMapping("/{accountId}/close")
    public ResponseEntity<Void> close(@PathVariable UUID accountId, java.security.Principal principal) {
        Account account = accountService.getAccount(accountId);
        checkOwnership(account, principal);
        accountService.closeAccount(accountId);
        return ResponseEntity.noContent().build();
    }

    private void checkOwnership(Account account, java.security.Principal principal) {
        if (principal == null || isAdmin()) return;
        if (!account.getUserId().toString().equals(principal.getName())) {
            throw new AccessDeniedException("Access denied: You do not have permission to access account " + account.getId());
        }
    }

    private void checkOwnershipOrAuditor(Account account, java.security.Principal principal) {
        if (principal == null || isAdmin() || isAuditor()) return;
        if (!account.getUserId().toString().equals(principal.getName())) {
            throw new AccessDeniedException("Access denied: You do not have permission to access ledger for account " + account.getId());
        }
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ADMIN".equals(a.getAuthority()));
    }

    private boolean isAuditor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_AUDITOR".equals(a.getAuthority()) || "AUDITOR".equals(a.getAuthority()));
    }

    private AccountResponse toDto(Account a) {
        return new AccountResponse(a.getId(), a.getUserId(), a.getAccountNumber(),
                a.getAccountType(), a.getBalance(), a.getStatus(), a.getCreatedAt(), a.getCurrency());
    }
}
