<?php


class EthTransaction {
    public object $originalTransaction;

    /**
     * EthTransaction constructor.
     * @param object $originalTransaction
     */
    public function __construct(object $originalTransaction) {
        $this->originalTransaction = $originalTransaction;
    }

    public function getBlockNumber(): int|null {
        if ($this->originalTransaction->blockNumber == null) {
            return null;
        }

        return hexdec($this->originalTransaction->blockNumber);
    }

    public function getInput(): string {
        return $this->originalTransaction->input;
    }
}