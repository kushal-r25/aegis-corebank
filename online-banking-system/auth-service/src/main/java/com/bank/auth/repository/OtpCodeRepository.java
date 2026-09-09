package com.bank.auth.repository;

import com.bank.auth.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OtpCodeRepository extends JpaRepository<OtpCode, UUID> {
}
