package com.bank.transaction.repository;

import com.bank.transaction.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    Page<Transaction> findByFromAccountIdOrToAccountId(UUID fromAccountId, UUID toAccountId, Pageable pageable);

    Page<Transaction> findByStatus(String status, Pageable pageable);

    List<Transaction> findByStatusAndCreatedAtBefore(String status, Instant cutoff);

    @Query("""
        SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t
        WHERE t.fromAccountId = :accountId
        AND t.status IN ('COMPLETED', 'RESERVED')
        AND CAST(t.createdAt AS date) = CURRENT_DATE
    """)
    BigDecimal sumTodaysOutgoingAmount(@Param("accountId") UUID accountId);

    long countByFromAccountIdAndCreatedAtAfter(UUID fromAccountId, Instant after);
}
