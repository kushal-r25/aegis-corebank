package com.bank.account.repository;

import com.bank.account.entity.Beneficiary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BeneficiaryRepository extends JpaRepository<Beneficiary, UUID> {
    List<Beneficiary> findByOwnerAccountId(UUID ownerAccountId);
    Optional<Beneficiary> findByIdAndOwnerAccountId(UUID id, UUID ownerAccountId);
}
