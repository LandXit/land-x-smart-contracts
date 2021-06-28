<?php

use Web3\Web3;
use Web3\Contract;
use Web3\Utils;
use Web3p\EthereumTx\Transaction;
use Web3p\EthereumUtil\Util as EthUtil;
use PrestaShop\Decimal\DecimalNumber as Decimal;

class LandXNFT {
    public const DECIMAL_PRECISION = 4;

    protected EthWrapper $eth;
    protected Contract $contract;

    protected string $contractAddress;

    protected string $pk;
    protected string $pkAddress;

    protected int $networkId;

    /**
     * LandXNFT constructor.
     * @param EthWrapper $eth
     * @param array $abi
     * @param string $contractAddress
     * @param string $pk
     * @param int $networkId
     */
    public function __construct(EthWrapper $eth, array $abi, string $contractAddress, string $pk, int $networkId = 1) {
        $this->eth = $eth;

        $this->contractAddress = $contractAddress;
        $this->contract = (new Contract($this->eth->getEth()->provider, $abi))->at($this->contractAddress);

        $this->pk = $pk;
        $this->pkAddress = $this->getAddressFromPK($this->pk);

        $this->networkId = $networkId;
    }

    /**
     * Mint a new token
     *
     * @param string $to
     * @param Decimal $landArea
     * @param Decimal $rentPerHectare
     * @param EthTxGas|null $gasInfo
     * @return string
     */
    public function mint(string $to, Decimal $landArea, Decimal $rentPerHectare, EthTxGas $gasInfo = null): string {
        $this->requireAddress($to, '`$to` should be valid ethereum address. Invalid value is: ' . $to);
        $landAreaInt = $this->decimalToInt($landArea);
        $rentPerHectareInt = $this->decimalToInt($rentPerHectare);

        $txData = '0x' . $this->contract->getData('mint', $to, $landAreaInt, $rentPerHectareInt);
        $nonce = $this->eth->getAccountNonce($this->pkAddress);

        if (!$gasInfo) {
            $gasInfo = new EthTxGas();
        }

        $txParams = [
            'from' => $this->pkAddress,
            'to' => $this->contractAddress,
            'value' => '0x0', // 0 eth
            'chainId' => $this->networkId,
            'nonce' => $nonce,
            'data' => $txData,

            'gas' => $gasInfo->getGasHexStr(),
            'gasPrice' => $gasInfo->getGasPriceHexStr(),
        ];

        $transaction = new Transaction($txParams);
        $signedTransaction = $transaction->sign($this->pk);

        $txId = $this->eth->sendRawTransaction($signedTransaction);

        return $txId;
    }

    /**
     * Fetch tokenId from transaction
     *
     * @param string $txId
     * @return int
     */
    public function fetchTokenId(string $txId): int {
        $txReceipt = $this->eth->getTransactionReceipt($txId);

        if (!$txReceipt->isSuccessful()) {
            throw new RuntimeException("fetchTokenId: transaction {$txId} is failed!");
        }

        if (strtolower($this->contractAddress) !== strtolower($txReceipt->getTo())) {
            throw new RuntimeException("fetchTokenId: contract address doesn't match: transaction to is: {$txReceipt->getTo()} !");
        }

        if (count($txReceipt->getLogs()) < 1) {
            throw new RuntimeException("fetchTokenId: logs count less than 1!");
        }

        $tx = $this->eth->getTransaction($txId);
        $txInput = Utils::stripZero($tx->getInput());

        $methodLength = 8;

        if (strlen($txInput) < $methodLength) {
            throw new RuntimeException("fetchTokenId: can't fetch method from tx: {$txReceipt->getTo()} !");
        }

        $inputMethod = substr($txInput, 0, $methodLength);
        $inputFunction = null;

        foreach ($this->contract->getFunctions() as $function) {
            if ($function["name"] === 'mint') {
                $inputFunction = $function;
                break;
            }
        };

        if (!$inputFunction) {
            throw new RuntimeException("fetchTokenId: can't fetch method `mint` from ABI !");
        }
        $functionName = Utils::jsonMethodToString($inputFunction);
        $functionSignature = Utils::stripZero($this->contract->getEthabi()->encodeFunctionSignature($functionName));

        if (strtolower($inputMethod) !== strtolower($functionSignature)) {
            throw new RuntimeException("fetchTokenId: mint function signature doesn't match transaction's method!");
        }

        $firstLog = $txReceipt->getLogs()[0];
        if (count($firstLog->topics) < 4) {
            throw new RuntimeException("fetchTokenId: topics count less than 4!");
        }

        return hexdec($firstLog->topics[3]);
    }

    public function getTotalRent(int $tokenId): Decimal {
        $rawRent = null;
        $this->contract->call('getTotalRent', $tokenId, function ($err, $data) use (&$rawRent) {
            if ($err) {
                throw $err;
            }
            if ($data && is_array($data) && count($data) > 0) {
                $rawRent = $data[0];
            }
        });

        if ($rawRent === null) {
            throw new RuntimeException("getTotalRent: can't get rent from blockchain!");
        }

        $rent = (new Decimal($rawRent->toString()))->toMagnitude(-1 * self::DECIMAL_PRECISION);

        return $rent;
    }

    /**
     * Check if argument is valid ethereum address, otherwise throw an exception
     *
     * @param string $address
     * @param string $errorMsg
     */
    protected function requireAddress(string $address, string $errorMsg) {
        if (!Utils::isAddress($address)) {
            throw new InvalidArgumentException($errorMsg);
        }
    }

    /**
     * Convert Decimal to integer taking to account 'DECIMAL_PRECISION'
     *
     * @param Decimal $number
     * @return int
     */
    protected function decimalToInt(Decimal $number): int {
        return intval($number->toMagnitude(self::DECIMAL_PRECISION)->getIntegerPart());
    }

    /**
     * Generate Ethereum address from private key
     *
     * @param string $pk
     * @return string
     */
    protected function getAddressFromPK(string $pk): string {
        $ethUtil = new EthUtil();
        return $ethUtil->publicKeyToAddress($ethUtil->privateKeyToPublicKey($pk));
    }
}