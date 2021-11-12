# LandX NFT Contracts

### Always use the correct contract addresses

## Changelog:

#### Auction house v2:

- added pull payment on AuctionHouse

read user balances on

```
    mapping(address => uint256) public lostBidsWTC; //lost bid tracker
    mapping(address => uint256) public lostBidsUSDC; //lost bid tracker
```

and

show them a claim lost bids button calling
function withdrawRefunds(uint256 \_currency) with 0 or 1

---

added get back erc20, erc721 and erc1155 lost tokens in the contract

## WTC

Rinkeby: 0xFBb4273D7629096f1f3aF01B6BEaeB9A668b43e3

https://rinkeby.etherscan.io/address/0xFBb4273D7629096f1f3aF01B6BEaeB9A668b43e3#code

Mainnet: -

### used on stage

Rinkeby: 0xd641B15Cb3e83C4b0f6Fa01d715605bb601e72Aa

https://rinkeby.etherscan.io/address/0xd641b15cb3e83c4b0f6fa01d715605bb601e72aa#code

### used on dev

Rinkeby: 0xd641B15Cb3e83C4b0f6Fa01d715605bb601e72Aa

https://rinkeby.etherscan.io/address/0xd641b15cb3e83c4b0f6fa01d715605bb601e72aa#code

## Vesting WTC

Rinkeby: 0x67EFf653a0eB75612DE9a49Ec30374b15d7f31c3

https://rinkeby.etherscan.io/address/0x67EFf653a0eB75612DE9a49Ec30374b15d7f31c3#code

Mainnet: -

## NFT

Rinkeby: 0x1071B8DAF7f95014fE2013F15Ae717Ce3D5d5506

https://rinkeby.etherscan.io/address/0x1071B8DAF7f95014fE2013F15Ae717Ce3D5d5506#code

Mainnet: -

### used on stage

Rinkeby: 0x774E11da0D028B32CA92365242AF4eD3a58F75bd

https://rinkeby.etherscan.io/address/0x774E11da0D028B32CA92365242AF4eD3a58F75bd#code

### used on dev

Rinkeby: 0xBA0FfbbD8df1a6Df63a1a29348946808932b7a0C

https://rinkeby.etherscan.io/address/0xBA0FfbbD8df1a6Df63a1a29348946808932b7a0C#code

## Shard Manager

Rinkeby: 0x4c14ad04Caade0A59Bf91B946B6b3485CAaF59CF

https://rinkeby.etherscan.io/address/0x4c14ad04Caade0A59Bf91B946B6b3485CAaF59CF#code

Mainnet: -

### used on stage

LDXS Rinkeby: 0xd83dAFa368783b8076B9B557EB0590879c6384B1
https://rinkeby.etherscan.io/address/0xd83dAFa368783b8076B9B557EB0590879c6384B1#code

LDXM Rinkeby: 0xe70A1D11534f318Bfd467b5919c8142c93aed068
https://rinkeby.etherscan.io/address/0xe70A1D11534f318Bfd467b5919c8142c93aed068#code

LDXR Rinkeby: 0xA2Ed56D2Adbe94a3d3CbFCe9309a9AAcf346B5ba
https://rinkeby.etherscan.io/address/0xA2Ed56D2Adbe94a3d3CbFCe9309a9AAcf346B5ba#code

LDXW Rinkeby: 0x19FB3E7Fe28098999657A74a25c9969A75fbf4a6
https://rinkeby.etherscan.io/address/0x19FB3E7Fe28098999657A74a25c9969A75fbf4a6#code

### used on dev

RLDXS Rinkeby: 0xebbFAC1C9275dA7Cdcc896cFe0fF86ee5e489961
https://rinkeby.etherscan.io/address/0xebbFAC1C9275dA7Cdcc896cFe0fF86ee5e489961#code

LDXM Rinkeby: 0x0598059B571123eDfeD4c160215296Ec772E44e1
https://rinkeby.etherscan.io/address/0x0598059B571123eDfeD4c160215296Ec772E44e1#code

LDXR Rinkeby: 0xf38E74B953975e8C0c68BBb78af15F5AF7C27224
https://rinkeby.etherscan.io/address/0xf38E74B953975e8C0c68BBb78af15F5AF7C27224#code

LDXW Rinkeby: 0xC4d411B74f2eB8EFc4F1cC9BE8bC76211952E60b
https://rinkeby.etherscan.io/address/0xC4d411B74f2eB8EFc4F1cC9BE8bC76211952E60b#code

## Auction House (v3)

Rinkeby: 0x7b126723573b9DD4DAEb63AA6b1342E8396Fd61F

https://rinkeby.etherscan.io/address/0x7b126723573b9DD4DAEb63AA6b1342E8396Fd61F#code

### used on stage

Rinkeby: 0x1A1ff30F2A9a37780581525E0752F767B1e912dA

https://rinkeby.etherscan.io/address/0x1A1ff30F2A9a37780581525E0752F767B1e912dA#code

### used on dev

Rinkeby: 0x09c042fE13c7E3c127971aF2766d2Aa82760Aa8c

https://rinkeby.etherscan.io/address/0x09c042fE13c7E3c127971aF2766d2Aa82760Aa8c#code

## Staking #1 (50% APR)

Rinkeby: 0xa4245c472eCcaD3e55311E1D7f1B414F1671a6D9

https://rinkeby.etherscan.io/address/0xa4245c472eCcaD3e55311E1D7f1B414F1671a6D9#code

### Build and test

copy-paste the env-sample to .env and replace the private keys & api keys accordingly

```
npm install
```

start ganache. check the RPC server that it uses (usually HTTP://127.0.0.1:7545)

```
npm run test
```

all test should pass

## Publish on some blockchain (check package.json scripts)

```
npm run deploy_t:rinkeby
npm run deploy_v:mainnet
```

### License MIT

```

```
