const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants, BigNumber } = require("ethers");
const { ethers } = require("hardhat")

let oraclePrices, mockedKeyProtocalValues, mockedXTokenContract, mockedUniswapV3FactoryContract
let owner, acc1
describe("Oracle Prices", function () {
	beforeEach(async function () {
        console.log("", '\n')
		;[owner, acc1] = await ethers.getSigners()
        const keyProtocolVariablesContract = require("../artifacts/contracts/KeyProtocolVariables.sol/KeyProtocolVariables.json")
		mockedKeyProtocalValues= await deployMockContract(owner, keyProtocolVariablesContract.abi)
        const xTokenContract = require("../artifacts/contracts/xToken.sol/XToken.json")
		mockedXTokenContract = await deployMockContract(owner, xTokenContract.abi)
        const uniswapV3FactoryContract = require("../node_modules/@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json")
		mockedUniswapV3FactoryContract = await deployMockContract(owner, uniswapV3FactoryContract.abi)
		let oraclePricesContract = await ethers.getContractFactory("contracts/OraclePrices.sol:OraclePrices")
		oraclePrices = await oraclePricesContract.deploy(
			owner.address, 
			mockedXTokenContract.address, 
			mockedXTokenContract.address, 
			mockedXTokenContract.address, 
			mockedXTokenContract.address, 
			mockedKeyProtocalValues.address,
            mockedUniswapV3FactoryContract.address
		)
		await oraclePrices.deployed()
        await oraclePrices.grantRole("0x04824fcb60e7cc526d70b264caa65b62ed44d9c8e5d230e8ff6b0c7373843b8a", acc1.address)
    })

    it("owner can't renounceOwnership", async function () {
        await expect(oraclePrices.connect(owner).renounceOwnership()).to.be.revertedWith("can 't renounceOwnership here")
	})

    it("setGrainPrice works ", async function () {
        console.log("set price=500000000 (USDC per megatone) for SOY")
        await oraclePrices.connect(acc1).setGrainPrice("SOY", 500000000)
        expect(await oraclePrices.prices("SOY")).to.equal(500000000)
    })

    it("setGrainPrice doesn't work (has no role)", async function () {
        console.log("try to set price for SOY by address with no PRICE_SETTER role")
        expect(oraclePrices.setGrainPrice("SOY", 500000000)).to.be.revertedWith("not price setter")
    })

    it("setGrainPrice doesn't work (invalid value)", async function () {
        console.log("try to set TOO HIGH price for SOY")
        expect(oraclePrices.connect(acc1).setGrainPrice("SOY", 10000000000)).to.be.revertedWith("Invalid values")
    })

    it("setXTokenPrice works ", async function () {
        console.log("set price=6000000 (USDC per megatone) for xToken")
        await expect(oraclePrices.connect(acc1).setXTokenPrice(mockedXTokenContract.address, 6000000)).not.to.reverted
    })

    it("setXTokenPricee doesn't work (has no role)", async function () {
        console.log("try to set price for xToken by address with no PRICE_SETTER role")
         expect(oraclePrices.setXTokenPrice(mockedXTokenContract.address, 6000000)).to.be.revertedWith("not price setter")
    })

    it("setXTokenPrice doesn't work (invalid value)", async function () {
        console.log("try to set TOO HIGH price for xToken")
        expect(oraclePrices.connect(acc1).setXTokenPrice(mockedXTokenContract.address, 10000000000)).to.be.revertedWith("Invalid values")
    })

    it("get xToken price (prelauch is true)", async function () {
        console.log("get xToken price when prelaunch mode is enabled")
        await mockedKeyProtocalValues.mock.preLaunch.withArgs().returns(true)
        expect(await oraclePrices.getXTokenPrice(mockedXTokenContract.address)).to.equal(6000000)
    })

    it("get xToken price (prelauch is false, pool not found)", async function () {
        console.log("try to get xToken price when pre launch mode is disabled and uniswap pool is not found; in this case returns default price")
        await mockedKeyProtocalValues.mock.preLaunch.withArgs().returns(false)
        let usdc = await oraclePrices.usdc()
        await mockedUniswapV3FactoryContract.mock.getPool.withArgs(usdc, mockedXTokenContract.address, 3000).returns(constants.AddressZero)
        expect(await oraclePrices.getXTokenPrice(mockedXTokenContract.address)).to.be.equal(6000000)
    })

    it("get xToken price (prelauch is false, pool exists, token0 is usdc)", async function () {
        console.log("get xToken price when prelaunch mode is disabled, uniswap pool exists and token0 is USDC")
        const uniswapV3PoolContract = require("../node_modules/@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json")
		mockedUniswapV3PoolContract = await deployMockContract(owner, uniswapV3PoolContract.abi)
        await mockedKeyProtocalValues.mock.preLaunch.withArgs().returns(false)
        let usdc = await oraclePrices.usdc()
        await mockedUniswapV3FactoryContract.mock.getPool.withArgs(usdc, mockedXTokenContract.address, 3000).returns(mockedUniswapV3PoolContract.address)
        await mockedUniswapV3PoolContract.mock.token0.withArgs().returns(usdc)
        await mockedUniswapV3PoolContract.mock.slot0.withArgs().returns(BigNumber.from("158753242550116086674963003860"), 1, 1, 1, 1, 1,true)
        expect(await oraclePrices.getXTokenPrice(mockedXTokenContract.address)).to.be.equal(249065)
    })

    it("get xToken price (prelauch is false, pool exists, token0 is xToken)", async function () {
        console.log("get xToken price when prelaunch mode is disabled, uniswap pool exists and token0 is xToken")
        const uniswapV3PoolContract = require("../node_modules/@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json")
		mockedUniswapV3PoolContract = await deployMockContract(owner, uniswapV3PoolContract.abi)
        await mockedKeyProtocalValues.mock.preLaunch.withArgs().returns(false)
        let usdc = await oraclePrices.usdc()
        await mockedUniswapV3FactoryContract.mock.getPool.withArgs(usdc, mockedXTokenContract.address, 3000).returns(mockedUniswapV3PoolContract.address)
        await mockedUniswapV3PoolContract.mock.token0.withArgs().returns(mockedXTokenContract.address)
        await mockedUniswapV3PoolContract.mock.slot0.withArgs().returns(BigNumber.from("158753242550116086674963003860"), 1, 1, 1, 1, 1,true)
        expect(await oraclePrices.getXTokenPrice(mockedXTokenContract.address)).to.be.equal(4015004)
    })

    it("get xToken pool", async function () {
        console.log("returns xToken/USDC uniswap pool address")
        let usdc = await oraclePrices.usdc()
        await mockedUniswapV3FactoryContract.mock.getPool.withArgs(usdc, mockedXTokenContract.address, 3000).returns(constants.AddressZero)
        expect(await oraclePrices.getXtokenPool(mockedXTokenContract.address)).to.equal(constants.AddressZero)
    })
})