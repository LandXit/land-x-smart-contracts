const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants, BigNumber } = require("ethers");
const { ethers } = require("hardhat")

let oraclePrices, mockedKeyProtocalValues, mockedXTokenContract, mockedUniswapV3FactoryContract
let owner, acc1
describe("Oracle Prices", function () {
	beforeEach(async function () {
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
    it("setGrainPrice works ", async function () {
        await oraclePrices.connect(acc1).setGrainPrice("SOY", 500000000)
        expect(await oraclePrices.prices("SOY")).to.equal(500000000)
    })

    it("setGrainPrice doesn't work (has no role)", async function () {
         expect(oraclePrices.setGrainPrice("SOY", 500000000)).to.be.revertedWith("not price setter")
    })

    it("setGrainPrice doesn't work (invalid value)", async function () {
        expect(oraclePrices.connect(acc1).setGrainPrice("SOY", 10000000000)).to.be.revertedWith("Invalid values")
    })

    it("setXTokenPrice works ", async function () {
        await expect(oraclePrices.connect(acc1).setXTokenPrice(mockedXTokenContract.address, 6000000)).not.to.reverted
    })

    it("setXTokenPricee doesn't work (has no role)", async function () {
         expect(oraclePrices.setXTokenPrice(mockedXTokenContract.address, 6000000)).to.be.revertedWith("not price setter")
    })

    it("setXTokenPrice doesn't work (invalid value)", async function () {
        expect(oraclePrices.connect(acc1).setXTokenPrice(mockedXTokenContract.address, 10000000000)).to.be.revertedWith("Invalid values")
    })

    it("get xToken price (prelauch is true)", async function () {
        await mockedKeyProtocalValues.mock.preLaunch.withArgs().returns(true)
        expect(await oraclePrices.getXTokenPrice(mockedXTokenContract.address)).to.equal(6000000)
    })

    it("get xToken price (prelauch is false, pool not found)", async function () {
        await mockedKeyProtocalValues.mock.preLaunch.withArgs().returns(false)
        let usdc = await oraclePrices.usdc()
        await mockedUniswapV3FactoryContract.mock.getPool.withArgs(usdc, mockedXTokenContract.address, 3000).returns(constants.AddressZero)
        expect(await oraclePrices.getXTokenPrice(mockedXTokenContract.address)).to.be.equal(6000000)
    })

    it("get xToken price (prelauch is false, pool exists, token0 is usdc)", async function () {
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
        let usdc = await oraclePrices.usdc()
        await mockedUniswapV3FactoryContract.mock.getPool.withArgs(usdc, mockedXTokenContract.address, 3000).returns(constants.AddressZero)
        expect(await oraclePrices.getXtokenPool(mockedXTokenContract.address)).to.equal(constants.AddressZero)
    })
})