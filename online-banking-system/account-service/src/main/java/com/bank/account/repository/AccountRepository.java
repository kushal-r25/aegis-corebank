package com.bank.account.repository;

import com.bank.account.entity.Account;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {

    /**
     * Row-level pessimistic write lock. Used exclusively on the debit/credit path so that
     * two concurrent transfers touching the same account serialize instead of racing on
     * a read-modify-write of the balance. Lock timeout prevents indefinite blocking if a
     * transaction hangs.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000"))
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdForUpdate(@Param("id") UUID id);

    Optional<Account> findByAccountNumber(String accountNumber);

    java.util.List<Account> findByUserId(UUID userId);

    boolean existsByAccountNumber(String accountNumber);
}
