package com.bank.transaction.repository;

import com.bank.transaction.entity.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, String> {
    boolean existsByEventIdAndConsumerGroup(String eventId, String consumerGroup);
}