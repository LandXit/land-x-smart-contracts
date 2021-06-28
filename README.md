# LandX NFT Contracts

## Always use the correct contract addresses

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

## Publish on some blockchain

```
npm run deploy:ropsten
npm run deploy:mainnet
```

### License MIT
