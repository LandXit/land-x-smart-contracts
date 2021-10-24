# LandX NFT Contracts

### Always use the correct contract addresses

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

Rinkeby: 0x1071B8DAF7f95014fE2013F15Ae717Ce3D5d5506

https://rinkeby.etherscan.io/address/0x1071b8daf7f95014fe2013f15ae717ce3d5d5506#code

### used on dev

Rinkeby: 0x4fB0c691071E4f41aEf79fdCd540F82F709b3E73

https://rinkeby.etherscan.io/address/0x4fB0c691071E4f41aEf79fdCd540F82F709b3E73#code

## Shard Manager

Rinkeby: 0x4c14ad04Caade0A59Bf91B946B6b3485CAaF59CF

https://rinkeby.etherscan.io/address/0x4c14ad04Caade0A59Bf91B946B6b3485CAaF59CF#code

Mainnet: -

### used on stage

Rinkeby: 0x4Bae84271ED418Bda8a7e679Ae2423aF0CFCC4C1

https://rinkeby.etherscan.io/address/0x4Bae84271ED418Bda8a7e679Ae2423aF0CFCC4C1#code

### used on dev

Rinkeby: 0x37533aFF22a3728a4Cbe94F004EcF1062b3Ef672

https://rinkeby.etherscan.io/address/0x37533aFF22a3728a4Cbe94F004EcF1062b3Ef672#code

## Auction House (v2. with reserved price)

Rinkeby: 0x5bf6f639146e4291Aba51B954046C32a74B8eE9e

https://rinkeby.etherscan.io/address/0x5bf6f639146e4291Aba51B954046C32a74B8eE9e#code

### used on stage

Rinkeby: 0x0CA0909ee9A004d5E3568C1d41C8006F47B92805

https://rinkeby.etherscan.io/address/0x0CA0909ee9A004d5E3568C1d41C8006F47B92805#code

### used on dev

Rinkeby: 0xF184C0AE661DF32670d5934c8c7E501D3EBf8BA9

https://rinkeby.etherscan.io/address/0xF184C0AE661DF32670d5934c8c7E501D3EBf8BA9#code


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
