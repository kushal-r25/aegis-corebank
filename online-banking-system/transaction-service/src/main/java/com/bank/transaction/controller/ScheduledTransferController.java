package com.bank.transaction.controller;

import com.bank.common.dto.request.ScheduledTransferRequest;
import com.bank.common.dto.response.ScheduledTransferResponse;
import com.bank.transaction.service.ScheduledTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/scheduled-transfers")
@RequiredArgsConstructor
public class ScheduledTransferController {

    private final ScheduledTransferService stService;

    @PostMapping
    public ResponseEntity<ScheduledTransferResponse> create(@Valid @RequestBody ScheduledTransferRequest req) {
        return ResponseEntity.status(201).body(stService.create(req));
    }

    @GetMapping
    public ResponseEntity<List<ScheduledTransferResponse>> list(
            @RequestParam(name = "userId", required = false) UUID userId,
            java.security.Principal principal) {
        if (userId != null) {
            return ResponseEntity.ok(stService.listByUser(userId));
        }
        if (principal != null && principal.getName() != null) {
            try {
                return ResponseEntity.ok(stService.listByUser(UUID.fromString(principal.getName())));
            } catch (IllegalArgumentException ignored) {}
        }
        return ResponseEntity.ok(stService.listAll());
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ScheduledTransferResponse> cancel(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(stService.cancel(id));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<ScheduledTransferResponse> pause(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(stService.pause(id));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<ScheduledTransferResponse> resume(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(stService.resume(id));
    }
}