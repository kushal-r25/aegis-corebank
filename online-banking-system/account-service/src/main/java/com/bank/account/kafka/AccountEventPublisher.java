package com.bank.account.kafka;

import com.bank.common.dto.events.BalanceChangedEvent;
import com.bank.common.kafka.EventPublisher;
import com.bank.common.kafka.KafkaTopics;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AccountEventPublisher {

    private final EventPublisher eventPublisher;

    public void publishBalanceChanged(UUID accountId, BigDecimal newBalance, String reason) {
        eventPublisher.publish(
                KafkaTopics.BALANCE_CHANGED,
                accountId.toString(),
                new BalanceChangedEvent(accountId, newBalance, reason)
        );
    }
}
