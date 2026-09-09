package com.bank.transaction.repository;

import com.bank.transaction.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, java.util.UUID> {
    List<OutboxEvent> findTop50ByPublishedFalseOrderByCreatedAtAsc();
    List<OutboxEvent> findByAggregateId(java.util.UUID aggregateId);
}
