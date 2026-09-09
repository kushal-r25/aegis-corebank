package com.bank.transaction.repository;

import com.bank.transaction.entity.ScheduledTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ScheduledTransferRepository extends JpaRepository<ScheduledTransfer, UUID> {
    List<ScheduledTransfer> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<ScheduledTransfer> findByStatusAndNextExecutionTimeBefore(String status, Instant now);
}