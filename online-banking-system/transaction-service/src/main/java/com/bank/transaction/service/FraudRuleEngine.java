package com.bank.transaction.service;

import com.bank.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Lives inside Transaction Service rather than as its own microservice — the rules
 * are cheap, synchronous DB reads scoped to a single transfer decision; splitting
 * this out would add a network hop and a Kafka topic without adding real signal
 * for a project at this scale. A real bank might split it once rules become a
 * standalone ML model with its own deployment cadence.
 */
@Component
@RequiredArgsConstructor
public class FraudRuleEngine {

    private static final BigDecimal SINGLE_TXN_LIMIT = new BigDecimal("100000.00");
    private static final BigDecimal DAILY_LIMIT = new BigDecimal("500000.00");
    private static final int MAX_TXNS_PER_MINUTE = 5;

    private final TransactionRepository transactionRepo;

    public FraudCheckResult evaluate(UUID fromAccountId, BigDecimal amount) {
        if (amount.compareTo(SINGLE_TXN_LIMIT) > 0) {
            return FraudCheckResult.blocked("Exceeds single-transaction limit of " + SINGLE_TXN_LIMIT);
        }

        BigDecimal todayTotal = transactionRepo.sumTodaysOutgoingAmount(fromAccountId);
        if (todayTotal.add(amount).compareTo(DAILY_LIMIT) > 0) {
            return FraudCheckResult.blocked("Exceeds daily limit of " + DAILY_LIMIT);
        }

        long recentCount = transactionRepo.countByFromAccountIdAndCreatedAtAfter(
                fromAccountId, Instant.now().minus(1, ChronoUnit.MINUTES));
        if (recentCount >= MAX_TXNS_PER_MINUTE) {
            return FraudCheckResult.review("Velocity check triggered: " + recentCount + " transfers in the last minute");
        }

        return FraudCheckResult.ok();
    }

    public record FraudCheckResult(String status, String reason) {
        public static FraudCheckResult ok() {
            return new FraudCheckResult("OK", null);
        }
        public static FraudCheckResult review(String reason) {
            return new FraudCheckResult("REVIEW", reason);
        }
        public static FraudCheckResult blocked(String reason) {
            return new FraudCheckResult("BLOCKED", reason);
        }
    }
}
