<?php

class EthTransactionReceipt {
    public object $originalTransactionReceipt;

    /**
     * EthTransactionReceipt constructor.
     * @param object $originalTransactionReceipt
     */
    public function __construct(object $originalTransactionReceipt) {
        $this->originalTransactionReceipt = $originalTransactionReceipt;
    }

    public function isSuccessful(): bool {
        return hexdec($this->originalTransactionReceipt->status) === 1;
    }

    public function getTo(): string {
        return $this->originalTransactionReceipt->to;
    }

    public function getLogs(): array {
        return $this->originalTransactionReceipt->logs;
    }
}