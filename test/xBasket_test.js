const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { constants, BigNumber } = require("ethers");
const { ethers} = require("hardhat");
const { time, BN } = require("@openzeppelin/test-helpers");
let mockedUSDCContract, mockedOraclePricesContract, mockedXTokenRouterContract, mockedUniswapRouter, mockedTwap, mockedKeyProtocolVariablesContract
let xBasket
let cSOY, cWHEAT, cRICE, cCORN, xSOY, xRICE, xWHEAT, xCORN
let owner, acc1, acc2
describe("xBasket", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2] = await ethers.getSigners()
        const ERC20Contract = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json")
        mockedUSDCContract = await deployMockContract(owner, ERC20Contract.abi)
        
        const oraclePricesContract = require("../artifacts/contracts/OraclePrices.sol/OraclePrices.json")
        mockedOraclePricesContract = await deployMockContract(owner, oraclePricesContract.abi)
        
        const xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
		mockedXTokenRouterContract = await deployMockContract(owner, xTokenRouterContract.abi)

        const uniswapRouterContract = require("../node_modules/@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json")
		mockedUniswapRouter = await deployMockContract(owner, uniswapRouterContract.abi)

        const twapContract = require("../artifacts/contracts/TWAP.sol/TWAP.json")
		mockedTwap= await deployMockContract(owner, twapContract.abi)

        const keyProtocolVariablesContract = require("../artifacts/contracts/KeyProtocolVariables.sol/KeyProtocolVariables.json")
		mockedKeyProtocolVariablesContract = await deployMockContract(owner, keyProtocolVariablesContract.abi)

        const xTokenContract = require("../artifacts/contracts/xToken.sol/XToken.json")
        xSOY = await deployMockContract(owner, xTokenContract.abi)
        xRICE = await deployMockContract(owner, xTokenContract.abi)
        xWHEAT = await deployMockContract(owner, xTokenContract.abi)
        xCORN = await deployMockContract(owner, xTokenContract.abi)

        const cTokenContract = require("../artifacts/contracts/cToken.sol/CToken.json")
        cSOY = await deployMockContract(owner, cTokenContract.abi)
        cWHEAT = await deployMockContract(owner, cTokenContract.abi)
        cRICE = await deployMockContract(owner, cTokenContract.abi)
        cCORN = await deployMockContract(owner, cTokenContract.abi)


        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xCORN.address)
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xSOY.address)
        await mockedXTokenRouterContract.mock.getXToken.withArgs("RICE").returns(xRICE.address)
        await mockedXTokenRouterContract.mock.getXToken.withArgs("WHEAT").returns(xWHEAT.address)

        await mockedXTokenRouterContract.mock.getCToken.withArgs("CORN").returns(cCORN.address)
        await mockedXTokenRouterContract.mock.getCToken.withArgs("SOY").returns(cSOY.address)
        await mockedXTokenRouterContract.mock.getCToken.withArgs("RICE").returns(cRICE.address)
        await mockedXTokenRouterContract.mock.getCToken.withArgs("WHEAT").returns(cWHEAT.address)

        await mockedOraclePricesContract.mock.usdc.withArgs().returns(mockedUSDCContract.address)

        xBasketContract = await ethers.getContractFactory("contracts/xBasket.sol:xBasket")
		xBasket = await xBasketContract.deploy(mockedXTokenRouterContract.address, mockedOraclePricesContract.address, mockedKeyProtocolVariablesContract.address, mockedUniswapRouter.address, mockedTwap.address)
		await xBasket.deployed()

        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xCORN.address).returns(4430000)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xRICE.address).returns(6000000)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xWHEAT.address).returns(5000000)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xSOY.address).returns(8140000)

        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.prices.withArgs("SOY").returns(577244585)
        await mockedOraclePricesContract.mock.prices.withArgs("WHEAT").returns(327000000)
        await mockedOraclePricesContract.mock.prices.withArgs("RICE").returns(336008409)

        await xCORN.mock.balanceOf.withArgs(xBasket.address).returns(0)
        await xSOY.mock.balanceOf.withArgs(xBasket.address).returns(0)
        await xWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(0)
        await xRICE.mock.balanceOf.withArgs(xBasket.address).returns(0)

        await xCORN.mock.Staked.withArgs(xBasket.address).returns(1000000, 0)
        await xSOY.mock.Staked.withArgs(xBasket.address).returns(1000000, 0)
        await xWHEAT.mock.Staked.withArgs(xBasket.address).returns(1000000, 0)
        await xRICE.mock.Staked.withArgs(xBasket.address).returns(1000000, 0)

        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(0)

        await cCORN.mock.balanceOf.withArgs(xBasket.address).returns(0)
        await cSOY.mock.balanceOf.withArgs(xBasket.address).returns(0)
        await cWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(0)
        await cRICE.mock.balanceOf.withArgs(xBasket.address).returns(0)

        await xCORN.mock.availableToClaim.withArgs(xBasket.address).returns(1000000)
        await xSOY.mock.availableToClaim.withArgs(xBasket.address).returns(1000000)
        await xWHEAT.mock.availableToClaim.withArgs(xBasket.address).returns(1000000)
        await xRICE.mock.availableToClaim.withArgs(xBasket.address).returns(1000000)
    })

    it("owner can't renounceOwnership", async function () {
        await expect(xBasket.connect(owner).renounceOwnership()).to.be.revertedWith("can 't renounceOwnership here")
	})

    it("get decimals  works", async function () {
        expect(await xBasket.decimals()).to.equal(6)
	})

    it("Asset", async function () {
        expect(await xBasket.asset()).to.equal(mockedUSDCContract.address)
    }) 

    it("convert to shares, total supply 0", async function () {
        expect(await xBasket.convertToShares(1000000)).to.equal(4000000)
    }) 

    it("convert to assets, total supply 0", async function () {
        expect(await xBasket.convertToAssets(1000000)).to.equal(250000)
    }) 

    it("deposit, total supply 0", async function () {
        let assets = 1000000
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(1000000)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(4000000)
    }) 

    it("deposit, total supply > 0", async function () {
        let assets = 1000000
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(1000000)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)
        await xBasket.connect(acc1).deposit(1000000, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(7760478)
    }) 

    it("deposit, total supply > 0, not enough assets", async function () {
        let assets = 1000000
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(1000000)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)
        await expect(xBasket.connect(acc1).deposit(2000000, acc1.address)).to.be.revertedWith("ERC4626: deposit more than max")
        expect(await xBasket.balanceOf(acc1.address)).to.equal(4000000)
    }) 

    it("mint, total supply 0", async function () {
        let assets = 1000000
        let shares = 4000000
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(assets)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).mint(shares, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(shares)
    }) 

    it("mint, total supply > 0", async function () {
        let assets = 1000000
        let shares = 999994
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(assets)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)

        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, 265921).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, 265921).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, 265921).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, 265921).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(265922)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(265922)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(265922)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(265922)

        await xCORN.mock.stake.withArgs(265921).returns()
        await xSOY.mock.stake.withArgs(265921).returns()
        await xWHEAT.mock.stake.withArgs(265921).returns()
        await xRICE.mock.stake.withArgs(265921).returns()
        await xBasket.connect(acc1).mint(shares, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(shares + 4000000)
    }) 

    it("mint, total supply > 0, not enough fund", async function () {
        let assets = 1000000
        let shares = 10000000
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(assets)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(50000)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(50000)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(50000)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(50000)

        await expect(xBasket.connect(acc1).mint(shares, acc1.address)).to.be.revertedWith("ERC4626: mint more than max")
    }) 
    

    it("withdraw", async function () {
        let assets = 1000000
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(1000000)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(4000000)
        
        await xCORN.mock.claim.returns()
        await xSOY.mock.claim.returns()
        await xWHEAT.mock.claim.returns()
        await xRICE.mock.claim.returns()

        await cWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cSOY.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cRICE.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cCORN.mock.balanceOf.withArgs(xBasket.address).returns(1000000)

        await cWHEAT.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)
        await mockedTwap.mock.getPrice.withArgs(mockedUSDCContract.address, xWHEAT.address).returns(6000000)
        
        await cSOY.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)  
        await mockedTwap.mock.getPrice.withArgs(mockedUSDCContract.address, xSOY.address).returns(6000000)

        await cRICE.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)
        await mockedTwap.mock.getPrice.withArgs(mockedUSDCContract.address, xRICE.address).returns(6000000)
       
        await cCORN.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)
        await mockedTwap.mock.getPrice.withArgs(mockedUSDCContract.address, xCORN.address).returns(6000000)

        await xWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xSOY.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xRICE.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xCORN.mock.balanceOf.withArgs(xBasket.address).returns(30000000)

        await xWHEAT.mock.stake.withArgs(30000000).returns()
        await xSOY.mock.stake.withArgs(30000000).returns()
        await xRICE.mock.stake.withArgs(30000000).returns()
        await xCORN.mock.stake.withArgs(30000000).returns()
       
        await xCORN.mock.unstake.withArgs(1000000).returns()
        await xSOY.mock.unstake.withArgs(1000000).returns()
        await xWHEAT.mock.unstake.withArgs(1000000).returns()
        await xRICE.mock.unstake.withArgs(1000000).returns()
        
        await xCORN.mock.transfer.withArgs(acc1.address, 1000000).returns(true)
        await xSOY.mock.transfer.withArgs(acc1.address, 1000000).returns(true)
        await xWHEAT.mock.transfer.withArgs(acc1.address, 1000000).returns(true)
        await xRICE.mock.transfer.withArgs(acc1.address, 1000000).returns(true)
        await mockedKeyProtocolVariablesContract.mock.buyXTokenSlippage.withArgs().returns(300)
        
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xRICE.address, 3000, xBasket.address,  (await time.latest()).toNumber()+ 15, 5000000, 29126213, 0]).returns(30000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xWHEAT.address, 3000, xBasket.address, (await time.latest()).toNumber()+ 15, 5000000, 29126213, 0]).returns(30000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xSOY.address, 3000, xBasket.address, (await time.latest()).toNumber() + 15, 5000000, 29126213, 0]).returns(30000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xCORN.address, 3000, xBasket.address, (await time.latest()).toNumber() + 15, 5000000, 29126213, 0]).returns(30000000)

        await xBasket.connect(acc1).withdraw(1000000, acc1.address, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(3872366)
    }) 
    

    it("get xBasket price", async function () {
        let assets = 1000000
        let shares = 39886
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(assets)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)
        
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, 999992).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, 999992).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, 999992).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, 999992).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(50000)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(50000)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(50000)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(50000)

        await xCORN.mock.stake.withArgs(999992).returns()
        await xSOY.mock.stake.withArgs(999992).returns()
        await xWHEAT.mock.stake.withArgs(999992).returns()
        await xRICE.mock.stake.withArgs(999992).returns()
        expect(await xBasket.pricePerToken()).to.equal(6267818)
    }) 

    it("redeem", async function () {
        let assets = 1000000
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(assets)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(assets)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(4000000)
        
        await xCORN.mock.claim.returns()
        await xSOY.mock.claim.returns()
        await xWHEAT.mock.claim.returns()
        await xRICE.mock.claim.returns()

        await cWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cSOY.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cRICE.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cCORN.mock.balanceOf.withArgs(xBasket.address).returns(1000000)

        await mockedKeyProtocolVariablesContract.mock.buyXTokenSlippage.withArgs().returns(300)

        await cWHEAT.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)
        await mockedTwap.mock.getPrice.withArgs(mockedUSDCContract.address, xWHEAT.address).returns(6000000)
        
        await cSOY.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)
        await mockedTwap.mock.getPrice.withArgs(mockedUSDCContract.address, xSOY.address).returns(6000000)

        await cRICE.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)
        await mockedTwap.mock.getPrice.withArgs(mockedUSDCContract.address, xRICE.address).returns(6000000)
       
        await cCORN.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)
        await mockedTwap.mock.getPrice.withArgs(mockedUSDCContract.address, xCORN.address).returns(6000000)

        await xWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xSOY.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xRICE.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xCORN.mock.balanceOf.withArgs(xBasket.address).returns(30000000)

        await xWHEAT.mock.stake.withArgs(30000000).returns()
        await xSOY.mock.stake.withArgs(30000000).returns()
        await xRICE.mock.stake.withArgs(30000000).returns()
        await xCORN.mock.stake.withArgs(30000000).returns()
       
        await xWHEAT.mock.unstake.withArgs(7834880).returns()
        await xCORN.mock.unstake.withArgs(7834880).returns()
        await xSOY.mock.unstake.withArgs(7834880).returns()
        await xRICE.mock.unstake.withArgs(7834880).returns()
        
        await xCORN.mock.transfer.withArgs(acc1.address, 7834880).returns(true)
        await xSOY.mock.transfer.withArgs(acc1.address, 7834880).returns(true)
        await xWHEAT.mock.transfer.withArgs(acc1.address, 7834880).returns(true)
        await xRICE.mock.transfer.withArgs(acc1.address, 7834880).returns(true)

        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xWHEAT.address, 3000, xBasket.address, (await time.latest()).toNumber()+ 15, 5000000, 29126213, 0]).returns(30000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xSOY.address, 3000, xBasket.address, (await time.latest()).toNumber()+ 15, 5000000, 29126213, 0]).returns(30000000)  
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xRICE.address, 3000, xBasket.address,  (await time.latest()).toNumber()+ 15, 5000000, 29126213, 0]).returns(30000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xCORN.address, 3000, xBasket.address, (await time.latest()).toNumber()+ 15, 5000000, 29126213, 0]).returns(30000000)

        await xBasket.connect(acc1).redeem(1000000, acc1.address, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(3000000)
    }) 

    it("can't redeem, ERC4626: redeem more than max", async function () {
        let assets = 1000000
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(1000000)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(4000000)
        
        await xCORN.mock.claim.returns()
        await xSOY.mock.claim.returns()
        await xWHEAT.mock.claim.returns()
        await xRICE.mock.claim.returns()

        await cWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cSOY.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cRICE.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cCORN.mock.balanceOf.withArgs(xBasket.address).returns(1000000)

        await cWHEAT.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)
        
        await cSOY.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)  

        await cRICE.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)
       
        await cCORN.mock.burn.withArgs(1000000).returns()
        await mockedUSDCContract.mock.balanceOf.withArgs(xBasket.address).returns(5000000)
        await mockedUSDCContract.mock.approve.withArgs(mockedUniswapRouter.address, 5000000).returns(true)

        await xWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xSOY.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xRICE.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xCORN.mock.balanceOf.withArgs(xBasket.address).returns(30000000)

        await xWHEAT.mock.stake.withArgs(30000000).returns()
        await xSOY.mock.stake.withArgs(30000000).returns()
        await xRICE.mock.stake.withArgs(30000000).returns()
        await xCORN.mock.stake.withArgs(30000000).returns()
       
        await xWHEAT.mock.unstake.withArgs(738672552).returns()
        await xCORN.mock.unstake.withArgs(738672552).returns()
        await xSOY.mock.unstake.withArgs(738672552).returns()
        await xRICE.mock.unstake.withArgs(738672552).returns()
        
        await xCORN.mock.transfer.withArgs(acc1.address, 738672552).returns(true)
        await xSOY.mock.transfer.withArgs(acc1.address, 738672552).returns(true)
        await xWHEAT.mock.transfer.withArgs(acc1.address, 738672552).returns(true)
        await xRICE.mock.transfer.withArgs(acc1.address, 738672552).returns(true)

        let bTime = (await time.latest()).toNumber()
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xRICE.address, 3000, xBasket.address,  bTime + 15, 5000000, 1, 0]).returns(30000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xWHEAT.address, 3000, xBasket.address, bTime + 15, 5000000, 1, 0]).returns(30000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xSOY.address, 3000, xBasket.address, bTime + 15, 5000000, 1, 0]).returns(30000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([mockedUSDCContract.address, xCORN.address, 3000, xBasket.address, bTime + 15, 5000000, 1, 0]).returns(30000000)

        await expect(xBasket.connect(acc1).redeem(5000000, acc1.address, acc1.address)).to.be.revertedWith("ERC4626: redeem more than max")
    }) 

    it("get total assets", async function () {
        let assets = 1000000
        await xCORN.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xSOY.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xWHEAT.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()
        await xRICE.mock.xBasketTransfer.withArgs(acc1.address, assets).returns()

        await xCORN.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xSOY.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xWHEAT.mock.balanceOf.withArgs(acc1.address).returns(1000000)
        await xRICE.mock.balanceOf.withArgs(acc1.address).returns(1000000)

        await xCORN.mock.stake.withArgs(assets).returns()
        await xSOY.mock.stake.withArgs(assets).returns()
        await xWHEAT.mock.stake.withArgs(assets).returns()
        await xRICE.mock.stake.withArgs(assets).returns()
        await xBasket.connect(acc1).deposit(1000000, acc1.address)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(4000000)

        await cWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cSOY.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cRICE.mock.balanceOf.withArgs(xBasket.address).returns(1000000)
        await cCORN.mock.balanceOf.withArgs(xBasket.address).returns(1000000)

        await xWHEAT.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xSOY.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xRICE.mock.balanceOf.withArgs(xBasket.address).returns(30000000)
        await xCORN.mock.balanceOf.withArgs(xBasket.address).returns(30000000)

        expect(await xBasket.totalAssets()).to.equal(733672552)
    })
})