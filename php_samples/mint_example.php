<?php

require './common.php';

use Web3\Web3;
use PrestaShop\Decimal\DecimalNumber as Decimal;
use Cloutier\PhpIpfsApi\IPFS;

$contractData = json_decode(file_get_contents('../build/contracts/LandXNFT.json'));
$secrets = json_decode(file_get_contents('../secrets.json'));

$web3 = new Web3('http://127.0.0.1:7545/');
$eth = new EthWrapper($web3->getEth());

$networkId = 5777;
$contractAddress = $contractData->networks->{$networkId}->address;
$tokenAbi = $contractData->abi;

$pk = $secrets->ganache_sign->mnemonic;

$landXNFT = new LandXNFT($eth, $tokenAbi, $contractAddress, $pk, $networkId);

$toAddr = "0x4B41E4f2323f50e6F167E25fa966c5b049Fd331a";

//echo "Mint token\n";
//
//$txId = $landXNFT->mint($toAddr, new Decimal('38.93'), new Decimal('140.6'));
//
//echo "Mint tx: " . $txId . "\n";
//
//echo "Wait for tx confirmation\n";
//
//while (!$eth->considerTransactionConfirmed($txId, 0)) {
//    sleep(10);
//}
//
//echo "tx confirmed!\n";
//
////$txId = '0x359bba1388d7a4e0b4c400ee8f613781a3a35cff63549f30e0e8e0628b853fc4'; // successful
//
//$tokenId = $landXNFT->fetchTokenId($txId);
//
//echo "tokenId is: {$tokenId}\n";
//
//$rent = $landXNFT->getTotalRent($tokenId);
//
//echo "token's rent is: {$rent}\n";

$ipfsAccessKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDVmODczYzk0RDQ5QUE4YmEzYzdiRjVjNTMyRUMxNUZjYjc1NERDZGMiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTYyNDg4NDU1NzYxOSwibmFtZSI6IkxhbmRYLWl0LWRldiJ9.WzR5t63Pcv_UhjU5WPlfDPS4Zncepkd4Cv_xVthl9oo';

$config = NFTStorage\Configuration::getDefaultConfiguration()->setAccessToken($ipfsAccessKey);

$apiInstance = new NFTStorage\Api\NFTStorageAPI(
// If you want use custom http client, pass your client which implements `GuzzleHttp\ClientInterface`.
// This is optional, `GuzzleHttp\Client` will be used as default.
    new GuzzleHttp\Client(),
    $config
);


$body = [
    'area'=> 93.4,
    'hectar_rent' => 12.3,
    'owner' => 'Yuri P.'
];

$body = "/path/to/file.txt"; // \SplFileObject

try {

    $fp = fopen('php://temp', 'w');
    $id = (int) $fp;
    fwrite($fp, json_encode($body));
    //$file = 'php://temp/maxmemory:1048576'; //partial memory buffering mode. Tries to use memory, but over 1MB will automatically page the excess to a file.

    $body = new SplFileObject("php://fd/$id", 'r');
    $body->fwrite(json_encode($body));

    $result = $apiInstance->store($body);
    print_r($result);
} catch (Exception $e) {
    echo 'Exception when calling NFTStorageAPI->store: ', $e->getMessage(), PHP_EOL;
}