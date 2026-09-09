package com.bank.common.kafka;

public final class KafkaTopics {
    public static final String TRANSFER_INITIATED  = "transfer.initiated";
    public static final String DEBIT_COMPLETED     = "debit.completed";
    public static final String DEBIT_FAILED        = "debit.failed";
    public static final String CREDIT_COMPLETED    = "credit.completed";
    public static final String CREDIT_FAILED       = "credit.failed";
    public static final String TRANSFER_COMPLETED  = "transfer.completed";
    public static final String TRANSFER_FAILED     = "transfer.failed";
    public static final String TRANSFER_REVERSED    = "transfer.reversed";
    public static final String BALANCE_CHANGED     = "balance.changed";

    private KafkaTopics() {}
}
