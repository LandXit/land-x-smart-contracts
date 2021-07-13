# LandX NFT Contracts

### Always use the correct contract addresses

## LNDX

Rinkeby: 0x579d9EBB5B5FFa356673f47E533356F31A15BEcD

https://rinkeby.etherscan.io/address/0x579d9EBB5B5FFa356673f47E533356F31A15BEcD#code

Mainnet: -

## Vesting LNDX

Rinkeby: 0x3eb4D4A6115a883D37B0712a31dE28f47BFa857a

https://rinkeby.etherscan.io/address/0x3eb4D4A6115a883D37B0712a31dE28f47BFa857a#code

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

Rinkeby: 0x2BA9562d54BC5d21c15CFE273f033CFF3a3E2b6E

https://rinkeby.etherscan.io/address/0x2BA9562d54BC5d21c15CFE273f033CFF3a3E2b6E#code

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
