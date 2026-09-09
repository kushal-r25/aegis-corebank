package com.bank.account.controller;

import com.bank.account.dto.BeneficiaryResponse;
import com.bank.account.service.BeneficiaryService;
import com.bank.common.dto.request.AddBeneficiaryRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/accounts/{accountId}/beneficiaries")
@RequiredArgsConstructor
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    @PostMapping
    public ResponseEntity<BeneficiaryResponse> add(@PathVariable("accountId") UUID accountId,
                                                   @Valid @RequestBody AddBeneficiaryRequest req) {
        return ResponseEntity.status(201).body(beneficiaryService.add(accountId, req));
    }

    @GetMapping
    public ResponseEntity<List<BeneficiaryResponse>> list(@PathVariable("accountId") UUID accountId) {
        return ResponseEntity.ok(beneficiaryService.list(accountId));
    }

    @PutMapping("/{beneficiaryId}")
    public ResponseEntity<BeneficiaryResponse> update(@PathVariable("accountId") UUID accountId,
                                                      @PathVariable("beneficiaryId") UUID beneficiaryId,
                                                      @RequestParam("nickname") String nickname) {
        return ResponseEntity.ok(beneficiaryService.update(ownerAccountId(accountId), beneficiaryId, nickname));
    }

    @PostMapping("/{beneficiaryId}/block")
    public ResponseEntity<BeneficiaryResponse> block(@PathVariable("accountId") UUID accountId, @PathVariable("beneficiaryId") UUID beneficiaryId) {
        return ResponseEntity.ok(beneficiaryService.block(accountId, beneficiaryId));
    }

    @PostMapping("/{beneficiaryId}/unblock")
    public ResponseEntity<BeneficiaryResponse> unblock(@PathVariable("accountId") UUID accountId, @PathVariable("beneficiaryId") UUID beneficiaryId) {
        return ResponseEntity.ok(beneficiaryService.unblock(accountId, beneficiaryId));
    }

    @DeleteMapping("/{beneficiaryId}")
    public ResponseEntity<Void> remove(@PathVariable("accountId") UUID accountId, @PathVariable("beneficiaryId") UUID beneficiaryId) {
        beneficiaryService.remove(accountId, beneficiaryId);
        return ResponseEntity.noContent().build();
    }

    private UUID ownerAccountId(UUID id) { return id; }
}
