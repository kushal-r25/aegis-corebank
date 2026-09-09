package com.bank.transaction.controller;

import com.bank.transaction.entity.FraudRecord;
import com.bank.transaction.repository.FraudRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/fraud")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class FraudController {

    private final FraudRecordRepository fraudRepo;

    @GetMapping("/records")
    public ResponseEntity<List<FraudRecord>> listRecords(@RequestParam(name = "status", required = false) String status) {
        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(fraudRepo.findByStatusOrderByCreatedAtDesc(status.toUpperCase()));
        }
        return ResponseEntity.ok(fraudRepo.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/records/{id}/approve")
    public ResponseEntity<FraudRecord> approve(@PathVariable("id") UUID id, java.security.Principal principal) {
        FraudRecord record = fraudRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("Fraud record not found"));
        record.setStatus("APPROVED");
        record.setReviewedBy(principal != null ? principal.getName() : "ADMIN");
        record.setReviewedAt(Instant.now());
        return ResponseEntity.ok(fraudRepo.save(record));
    }

    @PostMapping("/records/{id}/reject")
    public ResponseEntity<FraudRecord> reject(@PathVariable("id") UUID id, java.security.Principal principal) {
        FraudRecord record = fraudRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("Fraud record not found"));
        record.setStatus("REJECTED");
        record.setReviewedBy(principal != null ? principal.getName() : "ADMIN");
        record.setReviewedAt(Instant.now());
        return ResponseEntity.ok(fraudRepo.save(record));
    }
}