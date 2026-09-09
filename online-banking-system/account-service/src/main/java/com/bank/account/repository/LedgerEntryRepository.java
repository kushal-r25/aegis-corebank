package com.bank.account.repository;

import com.bank.account.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {
    List<LedgerEntry> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
    List<LedgerEntry> findByReferenceId(String referenceId);
}