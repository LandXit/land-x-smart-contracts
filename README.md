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

Rinkeby: 0xfb3EF7FA8f5f90ea7EA63b84D98E063002Bc2233

https://rinkeby.etherscan.io/address/0xfb3EF7FA8f5f90ea7EA63b84D98E063002Bc2233#code

### used on dev

Rinkeby: 0xfb3EF7FA8f5f90ea7EA63b84D98E063002Bc2233

https://rinkeby.etherscan.io/address/0xfb3EF7FA8f5f90ea7EA63b84D98E063002Bc2233#code

## Vesting WTC

Rinkeby: 0x67EFf653a0eB75612DE9a49Ec30374b15d7f31c3

https://rinkeby.etherscan.io/address/0x67EFf653a0eB75612DE9a49Ec30374b15d7f31c3#code

Mainnet: -

## NFT

Rinkeby: 0x1071B8DAF7f95014fE2013F15Ae717Ce3D5d5506

https://rinkeby.etherscan.io/address/0x1071B8DAF7f95014fE2013F15Ae717Ce3D5d5506#code

Mainnet: -

### used on stage

Rinkeby: 0xf34cF4fBD8B40DdDC353a822F83B7CDdE1f3045c

https://rinkeby.etherscan.io/address/0xf34cF4fBD8B40DdDC353a822F83B7CDdE1f3045c#code

### used on dev

Rinkeby: 0x9EE30998F795702D55909759Da0bbf79DA9f8E3F

https://rinkeby.etherscan.io/address/0x9EE30998F795702D55909759Da0bbf79DA9f8E3F#code

## Shard Manager

Rinkeby: 0x4c14ad04Caade0A59Bf91B946B6b3485CAaF59CF

https://rinkeby.etherscan.io/address/0x4c14ad04Caade0A59Bf91B946B6b3485CAaF59CF#code

Mainnet: -

### used on stage

LDXS Rinkeby: 0xD62fDABC4BC384378674C9f8E95ae1C46deD992e
https://rinkeby.etherscan.io/address/0xD62fDABC4BC384378674C9f8E95ae1C46deD992e#code

LDXM Rinkeby: 0x6b7F82b1aF083b1679a8Bb364D84b18C27618F65
https://rinkeby.etherscan.io/address/0x6b7F82b1aF083b1679a8Bb364D84b18C27618F65#code

LDXR Rinkeby: 0xBeDFa995BB374A16CE52b9117d90c9e0D74890D9
https://rinkeby.etherscan.io/address/0xBeDFa995BB374A16CE52b9117d90c9e0D74890D9#code

LDXW Rinkeby: LDXW 0x2E5cC1CD55D2B25d23214D13E8D0ffA9B4c52E12
https://rinkeby.etherscan.io/address/0x2E5cC1CD55D2B25d23214D13E8D0ffA9B4c52E12#code

### used on dev

LDXS Rinkeby: 0x3ac6cDf12426737BDE39B75a73dffA86e989962b
https://rinkeby.etherscan.io/address/0x3ac6cDf12426737BDE39B75a73dffA86e989962b#code

LDXM Rinkeby: 0x7ae66DEc481DFBb173022eF70CF76984F9EFdB44
https://rinkeby.etherscan.io/address/0x7ae66DEc481DFBb173022eF70CF76984F9EFdB44#code

LDXR Rinkeby: 0x585cc85929CE36928eeB865Ed6D866763C8C3395
https://rinkeby.etherscan.io/address/0x585cc85929CE36928eeB865Ed6D866763C8C3395#code

LDXW Rinkeby: 0xC9Bc3e804f80e1b0E7Bb6e5c4D3a63F611Bf7587
https://rinkeby.etherscan.io/address/0xC9Bc3e804f80e1b0E7Bb6e5c4D3a63F611Bf7587#code

## Auction House

Rinkeby: 0x7b126723573b9DD4DAEb63AA6b1342E8396Fd61F

https://rinkeby.etherscan.io/address/0x7b126723573b9DD4DAEb63AA6b1342E8396Fd61F#code

### used on stage

Rinkeby: 0x60950999453A1d8d8dD48874F064eFF8bD627a95

https://rinkeby.etherscan.io/address/0x60950999453A1d8d8dD48874F064eFF8bD627a95#code

### used on dev

Rinkeby: 0xe254acac466938A4550b961D0CCb41bD7a585Da1

https://rinkeby.etherscan.io/address/0xe254acac466938A4550b961D0CCb41bD7a585Da1#code

## WTC Distributor

### used on stage

Rinkeby: 0x43D9bf130013CfD0988850D64Fa55f741B4bCBc8

https://rinkeby.etherscan.io/address/0x43D9bf130013CfD0988850D64Fa55f741B4bCBc8#code

### used on dev

Rinkeby: 0x25EF521e86098906aeda72afFeBd87025B9DFf39

https://rinkeby.etherscan.io/address/0x25EF521e86098906aeda72afFeBd87025B9DFf39#code

## Rent Foundation

### used on stage

Rinkeby: 0xB17ffeF6a9F2B2Cf5534C921d3eb36E9853C9A19

https://rinkeby.etherscan.io/address/0xB17ffeF6a9F2B2Cf5534C921d3eb36E9853C9A19#code

### used on dev

Rinkeby: 0x491955E543529A3fFBa6f95C6713082e1935b409

https://rinkeby.etherscan.io/address/0x491955E543529A3fFBa6f95C6713082e1935b409#code

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
