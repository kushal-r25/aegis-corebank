package com.bank.transaction.service;

import com.bank.transaction.client.AccountServiceClient;
import com.bank.transaction.entity.Transaction;
import com.bank.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Defense-in-depth for the (now closed by the outbox) crash window: if a transfer is
 * stuck in RESERVED for too long — outbox publish delayed indefinitely, consumer down
 * for an extended period, etc. — refund the source account and mark it COMPENSATED
 * rather than leaving money in limbo forever.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private static final int STUCK_THRESHOLD_MINUTES = 10;

    private final TransactionRepository txnRepo;
    private final AccountServiceClient accountClient;
    private final AuditService auditService;

    @Scheduled(fixedDelay = 300_000) // every 5 minutes
    @Transactional
    public void reconcileStuckTransfers() {
        Instant cutoff = Instant.now().minus(STUCK_THRESHOLD_MINUTES, ChronoUnit.MINUTES);
        List<Transaction> stuck = txnRepo.findByStatusAndCreatedAtBefore("RESERVED", cutoff);

        for (Transaction txn : stuck) {
            log.warn("Reconciling stuck transaction {} (RESERVED since {})", txn.getId(), txn.getCreatedAt());
            try {
                accountClient.credit(txn.getFromAccountId(), txn.getAmount());
                txn.setStatus("COMPENSATED");
                txn.setFailureReason("Reconciliation timeout — credit step never completed");
                txnRepo.save(txn);
                auditService.record(txn.getId(), "TRANSFER_COMPENSATED_BY_RECONCILIATION", null);
            } catch (Exception e) {
                log.error("Failed to reconcile transaction {}: {}", txn.getId(), e.getMessage());
            }
        }
    }
}
