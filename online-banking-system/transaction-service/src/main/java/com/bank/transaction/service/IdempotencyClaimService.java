package com.bank.transaction.service;

import com.bank.common.dto.request.TransferRequest;
import com.bank.transaction.entity.Transaction;
import com.bank.transaction.repository.TransactionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Optional;

/**
 * Provides atomic, race-safe idempotency claims in an isolated sub-transaction boundary (REQUIRES_NEW).
 * This prevents DataIntegrityViolationException from poisoning the caller's Hibernate Session
 * with rollback-only state when concurrent duplicate requests arrive simultaneously.
 */
@Slf4j
@Service
public class IdempotencyClaimService {

    private final TransactionRepository txnRepo;
    private final PlatformTransactionManager transactionManager;

    @org.springframework.beans.factory.annotation.Autowired
    public IdempotencyClaimService(TransactionRepository txnRepo,
                                  @org.springframework.beans.factory.annotation.Autowired(required = false) PlatformTransactionManager transactionManager) {
        this.txnRepo = txnRepo;
        this.transactionManager = transactionManager;
    }

    public IdempotencyClaimService(TransactionRepository txnRepo) {
        this(txnRepo, null);
    }

    public ClaimResult claimOrGet(TransferRequest req) {
        Optional<Transaction> existing = txnRepo.findByIdempotencyKey(req.idempotencyKey());
        if (existing.isPresent()) {
            return new ClaimResult(existing.get(), false);
        }

        try {
            Transaction saved;
            if (transactionManager != null) {
                TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
                txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                saved = txTemplate.execute(status -> {
                    Transaction txn = new Transaction();
                    txn.setIdempotencyKey(req.idempotencyKey());
                    txn.setFromAccountId(req.fromAccountId());
                    txn.setToAccountId(req.toAccountId());
                    txn.setAmount(req.amount());
                    txn.setStatus("INITIATED");
                    return txnRepo.saveAndFlush(txn);
                });
            } else {
                Transaction txn = new Transaction();
                txn.setIdempotencyKey(req.idempotencyKey());
                txn.setFromAccountId(req.fromAccountId());
                txn.setToAccountId(req.toAccountId());
                txn.setAmount(req.amount());
                txn.setStatus("INITIATED");
                saved = txnRepo.saveAndFlush(txn);
            }
            return new ClaimResult(saved, true);
        } catch (DataIntegrityViolationException ex) {
            log.info("Concurrent idempotency claim race detected for key {}, retrieving winner transaction", req.idempotencyKey());
            Transaction winner = txnRepo.findByIdempotencyKey(req.idempotencyKey())
                    .orElseThrow(() -> ex);
            return new ClaimResult(winner, false);
        }
    }

    public record ClaimResult(Transaction transaction, boolean isNewClaim) {}
}
