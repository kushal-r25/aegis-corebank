package com.bank.transaction.repository;

import com.bank.transaction.entity.FraudRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FraudRecordRepository extends JpaRepository<FraudRecord, UUID> {
    List<FraudRecord> findByStatusOrderByCreatedAtDesc(String status);
    List<FraudRecord> findAllByOrderByCreatedAtDesc();
}