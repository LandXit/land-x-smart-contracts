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

LDXS Rinkeby: 0xd408BD7C55367180e15bB3429131686d285CC0Cc
https://rinkeby.etherscan.io/address/0xd408BD7C55367180e15bB3429131686d285CC0Cc#code

LDXM Rinkeby: 0x43f42520cbF870dd1114df5d8432e114afb35eBb
https://rinkeby.etherscan.io/address/0x43f42520cbF870dd1114df5d8432e114afb35eBb#code

LDXR Rinkeby: 0x4e27DC0FaC0e334C1123C39A25B3f5BBE5D3b732
https://rinkeby.etherscan.io/address/0x4e27DC0FaC0e334C1123C39A25B3f5BBE5D3b732#code

LDXW Rinkeby: 0x84093F180CAEc1f88312B56F18cdCbef339f734C
https://rinkeby.etherscan.io/address/0x84093F180CAEc1f88312B56F18cdCbef339f734C#code

### used on dev

LDXS Rinkeby: 0x33DDc84F81164F4F5Eeb9c6A2c0aF44b85fCc81C
https://rinkeby.etherscan.io/address/0x33DDc84F81164F4F5Eeb9c6A2c0aF44b85fCc81C#code

LDXM Rinkeby: 0x2883891BF61724c828a93617C5E6CBcb5e3B4229
https://rinkeby.etherscan.io/address/0x2883891BF61724c828a93617C5E6CBcb5e3B4229#code

LDXR Rinkeby: 0x06a65860Cda7Acf71e1A2DCdCeA4e4948CC361b5
https://rinkeby.etherscan.io/address/0x06a65860Cda7Acf71e1A2DCdCeA4e4948CC361b5#code

LDXW Rinkeby: 0xe3669977571620F90b460E5Dcac6ffCBA6996777
https://rinkeby.etherscan.io/address/0xe3669977571620F90b460E5Dcac6ffCBA6996777#code

## Auction House

Rinkeby: 0x7b126723573b9DD4DAEb63AA6b1342E8396Fd61F

https://rinkeby.etherscan.io/address/0x7b126723573b9DD4DAEb63AA6b1342E8396Fd61F#code

### used on stage

Rinkeby:0x3Fb8486A7c3CD9ec5B39599024D831758D700865

https://rinkeby.etherscan.io/address/0x3Fb8486A7c3CD9ec5B39599024D831758D700865#code

### used on dev

Rinkeby: 0xbfD8CD51E0Ea108985d01C1003b88D9984E52Ff0

https://rinkeby.etherscan.io/address/0xbfD8CD51E0Ea108985d01C1003b88D9984E52Ff0#code

## WTC Distributor

### used on stage

Rinkeby: 0x43D9bf130013CfD0988850D64Fa55f741B4bCBc8

https://rinkeby.etherscan.io/address/0x43D9bf130013CfD0988850D64Fa55f741B4bCBc8#code

### used on dev

Rinkeby: 0x9D6EEe708a84BDa3aEb5b8C30Fc9Ee83Edd01929

https://rinkeby.etherscan.io/address/0x9D6EEe708a84BDa3aEb5b8C30Fc9Ee83Edd01929#code

## Rent Foundation

### used on stage

Rinkeby: 0xB17ffeF6a9F2B2Cf5534C921d3eb36E9853C9A19

https://rinkeby.etherscan.io/address/0xB17ffeF6a9F2B2Cf5534C921d3eb36E9853C9A19#code

### used on dev

Rinkeby: 0x74B7aBc332c18647511F5525CFccc3008FE7D866

https://rinkeby.etherscan.io/address/0x74B7aBc332c18647511F5525CFccc3008FE7D866#code

## Staking 

### used on stage
Rinkeby: 0x631878fcbabb7499b4515ec115d3b2c0b9282a33 https://rinkeby.etherscan.io/address/0x631878fcbabb7499b4515ec115d3b2c0b9282a33#code 

Rinkeby: 0x02EfDeE67245883c0E26cfCC14C3b08027fbA6ba https://rinkeby.etherscan.io/address/0x02EfDeE67245883c0E26cfCC14C3b08027fbA6ba#code

Rinkeby: 0x44872904589b79a9e8cd17457692a7a92fb7083f https://rinkeby.etherscan.io/address/0x44872904589b79a9e8cd17457692a7a92fb7083f#code  

### used on dev
Rinkeby: 0x2bAe7496a0A1d9667cA6f824d028d0E1669a84c9 https://rinkeby.etherscan.io/address/0x2bAe7496a0A1d9667cA6f824d028d0E1669a84c9#code

Rinkeby: 0x7e9424a97ceca372464b077181260f7106ea9b62 https://rinkeby.etherscan.io/address/0x7e9424a97ceca372464b077181260f7106ea9b62#code

Rinkeby: 0x13bc3790d6b8c620196315ba319afd16c5108a7b https://rinkeby.etherscan.io/address/0x13bc3790d6b8c620196315ba319afd16c5108a7b#code

### Staking #1 (50% APR)

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

See [full documentation](https://landxit.github.io/land-x-smart-contracts/)
