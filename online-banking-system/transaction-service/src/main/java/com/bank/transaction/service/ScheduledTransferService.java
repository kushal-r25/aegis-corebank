package com.bank.transaction.service;

import com.bank.common.dto.request.ScheduledTransferRequest;
import com.bank.common.dto.request.TransferRequest;
import com.bank.common.dto.response.ScheduledTransferResponse;
import com.bank.transaction.entity.ScheduledTransfer;
import com.bank.transaction.repository.ScheduledTransferRepository;
import com.bank.transaction.saga.TransferSagaOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledTransferService {

    private final ScheduledTransferRepository stRepo;
    private final TransferSagaOrchestrator sagaOrchestrator;

    @Transactional
    public ScheduledTransferResponse create(ScheduledTransferRequest req) {
        ScheduledTransfer st = new ScheduledTransfer();
        st.setUserId(req.userId());
        st.setFromAccountId(req.fromAccountId());
        st.setToAccountId(req.toAccountId());
        st.setAmount(req.amount());
        st.setFrequency(req.frequency().toUpperCase());
        st.setDescription(req.description());
        st.setStatus("ACTIVE");
        st.setNextExecutionTime(req.startDate() != null ? req.startDate() : Instant.now().plus(1, ChronoUnit.DAYS));
        return toDto(stRepo.save(st));
    }

    public List<ScheduledTransferResponse> listByUser(UUID userId) {
        return stRepo.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toDto).toList();
    }

    public List<ScheduledTransferResponse> listAll() {
        return stRepo.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public ScheduledTransferResponse cancel(UUID id) {
        ScheduledTransfer st = stRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("Scheduled transfer not found"));
        st.setStatus("CANCELLED");
        return toDto(stRepo.save(st));
    }

    @Transactional
    public ScheduledTransferResponse pause(UUID id) {
        ScheduledTransfer st = stRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("Scheduled transfer not found"));
        st.setStatus("PAUSED");
        return toDto(stRepo.save(st));
    }

    @Transactional
    public ScheduledTransferResponse resume(UUID id) {
        ScheduledTransfer st = stRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("Scheduled transfer not found"));
        st.setStatus("ACTIVE");
        return toDto(stRepo.save(st));
    }

    @Scheduled(fixedRate = 30000)
    @Transactional
    public void executeDueTransfers() {
        List<ScheduledTransfer> due = stRepo.findByStatusAndNextExecutionTimeBefore("ACTIVE", Instant.now());
        for (ScheduledTransfer st : due) {
            String idempotencyKey = "SCHEDULE-" + st.getId() + "-" + st.getNextExecutionTime().toEpochMilli();
            try {
                log.info("Executing scheduled transfer {} for user {} with key {}", st.getId(), st.getUserId(), idempotencyKey);
                sagaOrchestrator.initiateTransfer(new TransferRequest(st.getFromAccountId(), st.getToAccountId(), st.getAmount(), idempotencyKey));
                st.setLastExecutionTime(Instant.now());
                if ("ONCE".equalsIgnoreCase(st.getFrequency())) {
                    st.setStatus("COMPLETED");
                } else {
                    st.setNextExecutionTime(calculateNext(st.getFrequency(), Instant.now()));
                }
            } catch (Exception e) {
                log.error("Failed to execute scheduled transfer {}: {}", st.getId(), e.getMessage());
            }
            stRepo.save(st);
        }
    }

    private Instant calculateNext(String frequency, Instant from) {
        return switch (frequency.toUpperCase()) {
            case "DAILY" -> from.plus(1, ChronoUnit.DAYS);
            case "WEEKLY" -> from.plus(7, ChronoUnit.DAYS);
            case "MONTHLY" -> from.plus(30, ChronoUnit.DAYS);
            default -> from.plus(1, ChronoUnit.DAYS);
        };
    }

    private ScheduledTransferResponse toDto(ScheduledTransfer s) {
        return new ScheduledTransferResponse(s.getId(), s.getUserId(), s.getFromAccountId(), s.getToAccountId(),
                s.getAmount(), s.getFrequency(), s.getDescription(), s.getStatus(), s.getNextExecutionTime(),
                s.getLastExecutionTime(), s.getCreatedAt());
    }
}