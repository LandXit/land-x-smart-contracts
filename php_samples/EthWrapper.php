<?php

use Web3\Eth;
use phpseclib\Math\BigInteger;

class EthWrapper {
    protected Eth $eth;

    /**
     * EthWrapper constructor.
     * @param Eth $eth
     */
    public function __construct(Eth $eth) {
        $this->eth = $eth;
    }

    public function getEth(): Eth {
        return $this->eth;
    }

    /**
     * Fetch Account's nonce.
     *
     * Integer. This allows to overwrite your own pending transactions that use the same nonce.
     *
     * @param $address
     * @return string
     */
    public function getAccountNonce($address): string {
        $nonce = null;

        $this->eth->getTransactionCount($address, function ($err, $blockchainNonce) use (&$nonce) {
            if ($err) {
                throw $err;
            }
            $nonce = $blockchainNonce;
        });

        if (!$nonce) {
            throw new RuntimeException('`nonce` from blockchain is empty!');
        }

        return '0x' . dechex($nonce->toString());
    }

    /**
     * Send Raw(signed) transaction to a blockchain
     *
     * @param string $signedTransaction
     * @return string
     */
    public function sendRawTransaction(string $signedTransaction): string {
        $txId = null;

        $this->eth->sendRawTransaction('0x' . $signedTransaction, function ($err, $bcTxId) use (&$txId) {
            if ($err !== null) {
                throw $err;
            }
            $txId = $bcTxId;
        });

        if (!$txId) {
            throw new RuntimeException('`txId` from blockchain is empty!');
        }

        return $txId;
    }

    /**
     * Returns the current gas price in wei.
     *
     * @return BigInteger
     */
    public function gasPrice(): BigInteger {
        $gasPrice = null;

        $this->eth->gasPrice(function ($err, $bcGasPrice) use (&$gasPrice) {
            if ($err !== null) {
                throw $err;
            }
            $gasPrice = $bcGasPrice;
        });

        if (!$gasPrice) {
            throw new RuntimeException('`gasPrice` from blockchain is empty!');
        }

        return $gasPrice;
    }

    /**
     * Get transaction info, even about 'pending'
     *
     * @param string $txId
     * @return object
     */
    public function getTransaction(string $txId): EthTransaction {
        $tx = null;

        $this->eth->getTransactionByHash($txId, function ($err, $bcTx) use (&$tx) {
            if ($err !== null) {
                throw $err;
            }
            $tx = $bcTx;
        });

        if ($tx === null) {
            throw new RuntimeException('transaction not found! tx: ' . $txId);
        }

        return new EthTransaction($tx);
    }

    public function getLatestBlockNumber(): int {
        $blockNumber = null;

        $this->eth->blockNumber(function ($err, $bcBlockNumber) use (&$blockNumber) {
            if ($err !== null) {
                throw $err;
            }
            $blockNumber = $bcBlockNumber;
        });

        if ($blockNumber === null) {
            throw new RuntimeException('`blockNumber` from blockchain is empty!');
        }

        return intval($blockNumber->toString());
    }

    public function getTransactionReceipt(string $txId): EthTransactionReceipt {
        $txReceipt = null;

        $this->eth->getTransactionReceipt($txId, function ($err, $bcTxReceipt) use (&$txReceipt) {
            if ($err !== null) {
                throw $err;
            }
            $txReceipt = $bcTxReceipt;
        });

        if ($txReceipt === null) {
            throw new RuntimeException('transaction receipt not found! tx: ' . $txId);
        }

        return new EthTransactionReceipt($txReceipt);
    }

    /**
     * When transaction can be considered as "confirmed"
     * https://ethereum.stackexchange.com/questions/319/what-number-of-confirmations-is-considered-secure-in-ethereum
     *
     * @param string $txId
     * @param int $confirmationBlocksCount
     */
    public function considerTransactionConfirmed(string $txId, int $confirmationBlocksCount = 12): bool {
        $tx = $this->getTransaction($txId);

        $txBlockNumber = $tx->getBlockNumber();

        if ($txBlockNumber === null) {
            return false;
        }

        $latestBlockNumber = $this->getLatestBlockNumber();

        return $latestBlockNumber > ($txBlockNumber + $confirmationBlocksCount);
    }
}