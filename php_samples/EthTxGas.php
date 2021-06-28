<?php

use Web3\Utils;
use phpseclib\Math\BigInteger;

//'gas' => Utils::toHex(210000, true), // 2100000 - Gas Limit
//            'gasPrice' => Utils::toHex(Utils::toWei('20', 'gwei')->toString(), true),
class EthTxGas {

    protected BigInteger $gas;
    protected BigInteger $gasPrice;

    /**
     * EthTxGas constructor.
     */
    public function __construct(BigInteger $gas = null, BigInteger $gasPrice = null) {
        if ($gas === null) {
            $gas = new BigInteger(210000, 10);
        }

        if ($gasPrice === null) {
            $gasPrice = Utils::toWei('20', 'gwei');
        }

        $this->gas = $gas;
        $this->gasPrice = $gasPrice;
    }

    public function getGasHexStr(): string {
        return $this->convertToHexString($this->gas);
    }

    public function getGasPriceHexStr(): string {
        return $this->convertToHexString($this->gasPrice);
    }

    protected function convertToHexString(BigInteger $number): string {
        return Utils::toHex($number->toString(), true);
    }
}