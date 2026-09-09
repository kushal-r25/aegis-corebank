package com.bank.transaction.client;

import com.bank.common.dto.request.CreditRequest;
import com.bank.common.dto.request.DebitRequest;
import com.bank.common.exceptions.AccountNotFoundException;
import com.bank.common.exceptions.InsufficientFundsException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Synchronous client to Account Service's internal endpoints. Used for the "reserve
 * funds" (debit) step of the saga, which must be synchronous so the caller gets an
 * immediate success/failure. The credit step is also called through here, but from
 * an async Kafka listener (see TransferSagaOrchestrator).
 */
@Component
public class AccountServiceClient {

    private final RestClient restClient;

    public AccountServiceClient(@Value("${services.account.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public void debit(UUID accountId, BigDecimal amount) {
        try {
            restClient.post()
                    .uri("/internal/accounts/{id}/debit", accountId)
                    .body(new DebitRequest(amount))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.UnprocessableEntity e) {
            throw new InsufficientFundsException(accountId);
        } catch (HttpClientErrorException.NotFound e) {
            throw new AccountNotFoundException(accountId);
        }
    }

    public void credit(UUID accountId, BigDecimal amount) {
        try {
            restClient.post()
                    .uri("/internal/accounts/{id}/credit", accountId)
                    .body(new CreditRequest(amount))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.NotFound e) {
            throw new AccountNotFoundException(accountId);
        }
    }

    public void reverseTransfer(UUID debitedAccountId, UUID creditedAccountId, BigDecimal amount, String referenceId) {
        try {
            restClient.post()
                    .uri("/internal/accounts/reverse-transfer")
                    .body(new com.bank.common.dto.request.ReversalTransferRequest(
                            debitedAccountId, creditedAccountId, amount, referenceId))
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException.UnprocessableEntity e) {
            throw new InsufficientFundsException(debitedAccountId);
        } catch (HttpClientErrorException.NotFound e) {
            throw new AccountNotFoundException(debitedAccountId);
        }
    }
}
