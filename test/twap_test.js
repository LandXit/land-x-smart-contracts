const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants, BigNumber } = require("ethers");
const { ethers } = require("hardhat")

let twap, mockedXTokenContract, mockedUniswapV3FactoryContract, mockedUSDCContract, mockedUniswapV3PoolContract
let owner, acc1
describe("Twap", function () {
	beforeEach(async function () {
        console.log("", '\n')
		;[owner, acc1] = await ethers.getSigners()
        const xTokenContract = require("../artifacts/contracts/xToken.sol/XToken.json")
		mockedXTokenContract = await deployMockContract(owner, xTokenContract.abi)
        const ERC20Contract = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json")
        mockedUSDCContract = await deployMockContract(owner, ERC20Contract.abi)
        
        const uniswapV3FactoryContract = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json")
		mockedUniswapV3FactoryContract = await deployMockContract(owner, uniswapV3FactoryContract.abi)

        const uniswapV3PoolContract = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json")
		mockedUniswapV3PoolContract = await deployMockContract(owner, uniswapV3PoolContract.abi)
		
        let twapContract = await ethers.getContractFactory("contracts/TWAP.sol:TWAP")
		twap = await twapContract.deploy(mockedUniswapV3FactoryContract.address)
		await twap.deployed()
    })

    it("getPrice, pool not found ", async function () {
        await mockedUniswapV3FactoryContract.mock.getPool.withArgs(mockedUSDCContract.address, mockedXTokenContract.address, 3000).returns(constants.AddressZero)
        await expect(twap.getPrice(mockedUSDCContract.address, mockedXTokenContract.address)).to.be.revertedWith("pool not found")
    })

    it("getPrice ", async function () {
        await mockedUniswapV3FactoryContract.mock.getPool.withArgs(mockedUSDCContract.address, mockedXTokenContract.address, 3000).returns(mockedUniswapV3PoolContract.address)
        await mockedUniswapV3PoolContract.mock.token0.withArgs().returns(mockedXTokenContract.address)
        await mockedUniswapV3PoolContract.mock.observe.withArgs([3600, 0]).returns([1400490564, 1400000300], [])
        await mockedXTokenContract.mock.decimals.withArgs().returns(6)
        await mockedUSDCContract.mock.decimals.withArgs().returns(6)
        expect(await twap.getPrice(mockedUSDCContract.address, mockedXTokenContract.address)).to.be.equal(1013692)
    })

    it("getPrice ", async function () {
        await mockedUniswapV3FactoryContract.mock.getPool.withArgs(mockedUSDCContract.address, mockedXTokenContract.address, 3000).returns(mockedUniswapV3PoolContract.address)
        await mockedUniswapV3PoolContract.mock.token0.withArgs().returns(mockedUSDCContract.address)
        await mockedUniswapV3PoolContract.mock.observe.withArgs([3600, 0]).returns([1400490564, 1400000300], [])
        await mockedXTokenContract.mock.decimals.withArgs().returns(6)
        await mockedUSDCContract.mock.decimals.withArgs().returns(6)
        expect(await twap.getPrice(mockedUSDCContract.address, mockedXTokenContract.address)).to.be.equal(986492)
    })
   
})