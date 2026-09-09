package com.bank.account.service;

import com.bank.account.dto.BeneficiaryResponse;
import com.bank.account.entity.Beneficiary;
import com.bank.account.repository.AccountRepository;
import com.bank.account.repository.BeneficiaryRepository;
import com.bank.common.dto.request.AddBeneficiaryRequest;
import com.bank.common.exceptions.AccountNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepo;
    private final AccountRepository accountRepo;

    @Transactional
    public BeneficiaryResponse add(UUID ownerAccountId, AddBeneficiaryRequest req) {
        accountRepo.findById(ownerAccountId)
                .orElseThrow(() -> new AccountNotFoundException(ownerAccountId));

        accountRepo.findByAccountNumber(req.beneficiaryAccountNumber())
                .orElseThrow(() -> new AccountNotFoundException(req.beneficiaryAccountNumber()));

        Beneficiary b = new Beneficiary();
        b.setOwnerAccountId(ownerAccountId);
        b.setBeneficiaryAccount(req.beneficiaryAccountNumber());
        b.setNickname(req.nickname());
        Beneficiary saved = beneficiaryRepo.save(b);
        return toDto(saved);
    }

    public List<BeneficiaryResponse> list(UUID ownerAccountId) {
        return beneficiaryRepo.findByOwnerAccountId(ownerAccountId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public BeneficiaryResponse update(UUID ownerAccountId, UUID beneficiaryId, String nickname) {
        Beneficiary b = beneficiaryRepo.findByIdAndOwnerAccountId(beneficiaryId, ownerAccountId)
                .orElseThrow(() -> new IllegalArgumentException("Beneficiary not found"));
        b.setNickname(nickname);
        return toDto(beneficiaryRepo.save(b));
    }

    @Transactional
    public BeneficiaryResponse block(UUID ownerAccountId, UUID beneficiaryId) {
        Beneficiary b = beneficiaryRepo.findByIdAndOwnerAccountId(beneficiaryId, ownerAccountId)
                .orElseThrow(() -> new IllegalArgumentException("Beneficiary not found"));
        b.setStatus("BLOCKED");
        return toDto(beneficiaryRepo.save(b));
    }

    @Transactional
    public BeneficiaryResponse unblock(UUID ownerAccountId, UUID beneficiaryId) {
        Beneficiary b = beneficiaryRepo.findByIdAndOwnerAccountId(beneficiaryId, ownerAccountId)
                .orElseThrow(() -> new IllegalArgumentException("Beneficiary not found"));
        b.setStatus("ACTIVE");
        return toDto(beneficiaryRepo.save(b));
    }

    @Transactional
    public void remove(UUID ownerAccountId, UUID beneficiaryId) {
        Beneficiary b = beneficiaryRepo.findByIdAndOwnerAccountId(beneficiaryId, ownerAccountId)
                .orElseThrow(() -> new IllegalArgumentException("Beneficiary not found"));
        beneficiaryRepo.delete(b);
    }

    private BeneficiaryResponse toDto(Beneficiary b) {
        return new BeneficiaryResponse(b.getId(), b.getBeneficiaryAccount(), b.getNickname(), b.getStatus(), b.getCreatedAt());
    }
}
