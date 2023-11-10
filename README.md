[![codecov](https://codecov.io/gh/LandXit/land-x-smart-contracts/branch/develop/graph/badge.svg?token=J8INVF31NO)](https://codecov.io/gh/LandXit/land-x-smart-contracts)

# LandX Contracts

### Always use the correct contract addresses

## Contract adresses on landx testnet
Goerli USDC(internal): 0x78d581B48275DD87179D578c42F246B7263fA6da

### Landx NFT
Goerli: 0x060cad4ffc11eDB9f6A616B22011c42F57e4f4d4

### Landx xTokens
Goerli xSOY: 0xbfEd43C70faBea891Bf07dDD655CC0f19181feE6

Goerli xRICE: 0xa9799B908c6af693248DbfFbF000b6fBeD8d6FE0

Goerli xWHEAT: 0xA8193a593a7456c500E5994ba6e2db5A3BCBFBe5

Goerli xCORN: 0x051Ed49fE15d180663D01914A8f4ab047f6F45A2

### Landx cTokens
Goerli cSOY: 0xFf39EB65c371fA7c9Fe065C096Db63a220b0e9A2

Goerli cRICE: 00x4f88c919f5b64A34e06c22B330325e2CFB9C4420

Goerli cWHEAT: 0xaCC1e827B10e2CA44bCbC3a60eF66B6ACE27432b

Goerli cCORN: 0x60E4B173DaBAbCfecdb6062235197b859e469A2b

### Landx xBasket
Goerli: 0x5D556069e1e636D3f7855d0f77577A84eCc6beBD

### Landx LNDX
Goerli: 0xb649d81f6e22975a88a4690cc8fe95f11681411c

### Landx veLNDX
Goerli: 0xa1e8119e37f4cec6519eb1b35d13e8c5914f52c4

### Landx RentFoundation
Goerli: 0xFda2F82fa3dE7B1f3718cDb2CA1c2dA11403C892

### Landx xTokenRouter
Goerli: 0x928F9E9C6934952B06F7179dc134Ea80d7E6d51A

### Landx OraclePrices
Goerli: 0x66339B59bDbbCB45847e48E585CD2ec6d20A164b

### Landx KeyProtocolValues
Goerli: 0x2e8E756C503F0d7996d658DAdBCeE389Bb9f524A
### Build and test

copy-paste the env-sample to .env and replace the private keys & api keys accordingly

```
npm install
```

Start ganache. check the RPC server that it uses (usually HTTP://127.0.0.1:7545)

```
npm run test
```

all test should pass

## Publish on some blockchain (check package.json scripts)

```
Check the scripts in /scripts and update contract addresses if it is required
npm run deploy_t:goerli
```

See [full documentation](https://landxit.github.io/land-x-smart-contracts/)

External Audit
[Audit reports](docs/audit/)