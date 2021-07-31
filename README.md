# LandX NFT Contracts

### Always use the correct contract addresses

## WTC

Rinkeby: 0xFBb4273D7629096f1f3aF01B6BEaeB9A668b43e3

https://rinkeby.etherscan.io/address/0xFBb4273D7629096f1f3aF01B6BEaeB9A668b43e3#code

Mainnet: -

## Vesting WTC

Rinkeby: 0x67EFf653a0eB75612DE9a49Ec30374b15d7f31c3

https://rinkeby.etherscan.io/address/0x67EFf653a0eB75612DE9a49Ec30374b15d7f31c3#code

Mainnet: -

## NFT

Rinkeby: 0x1071B8DAF7f95014fE2013F15Ae717Ce3D5d5506

https://rinkeby.etherscan.io/address/0x1071B8DAF7f95014fE2013F15Ae717Ce3D5d5506#code

Mainnet: -

## Shard Manager

Rinkeby: 0x4c14ad04Caade0A59Bf91B946B6b3485CAaF59CF

https://rinkeby.etherscan.io/address/0x4c14ad04Caade0A59Bf91B946B6b3485CAaF59CF#code

Mainnet: -

## Auction House

Rinkeby: 0x8145FA081BBB8634ce7Cdf6e601A23891E2932E7

https://rinkeby.etherscan.io/address/0x8145FA081BBB8634ce7Cdf6e601A23891E2932E7#code

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
