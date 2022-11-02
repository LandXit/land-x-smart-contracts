const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants } = require("ethers");
const { ethers } = require("hardhat")

let cToken
let owner, acc1, xTokenContractAddress
let mockedRentFoundationContract, mockedXTokenRouterContract

describe("cToken", function () {
	beforeEach(async function () {
		;[owner, acc1, xTokenContractAddress] = await ethers.getSigners()
		const RentFoundationContract = require("../artifacts/contracts/rentFoundation.sol/RentFoundation.json")
		mockedRentFoundationContract = await deployMockContract(owner, RentFoundationContract.abi)
		const xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
		mockedXTokenRouterContract = await deployMockContract(owner, xTokenRouterContract.abi)
		let cTokenContract = await ethers.getContractFactory("CToken")
		cToken = await cTokenContract.deploy(mockedRentFoundationContract.address, mockedXTokenRouterContract.address, "CORN")
		await cToken.deployed()
	})

	it("minting  works", async function () {
		await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xTokenContractAddress.address)
		
		await cToken.connect(xTokenContractAddress).mint(acc1.address, 1000000)
        expect(await cToken.balanceOf(acc1.address)).to.equal(1000000)
	})

    it("minting doesn't  work", async function () {
		await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(owner.address)
		await expect(cToken.connect(xTokenContractAddress).mint(acc1.address, 1000000)).to.be.reverted
	})

    it("get decimals  works", async function () {
        expect(await cToken.decimals()).to.equal(6)
	})

    it("set XTokenRouter", async function () {
        let xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
        let mockedXTokenRouterContract2 = await deployMockContract(owner, xTokenRouterContract.abi)
        await cToken.setXTokenRouter(mockedXTokenRouterContract2.address)
        expect(await cToken.xTokenRouter()).to.equal(mockedXTokenRouterContract2.address)
	})

    it("it is not possible to set XTokenRouter (not owner contract)", async function () {
        let xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
        let mockedXTokenRouterContract2 = await deployMockContract(owner, xTokenRouterContract.abi)
        await expect(cToken.connect(acc1).setXTokenRouter(mockedXTokenRouterContract2.address)).to.be.reverted
	})

    it("set RentFoundation contract", async function () {
        let rentFoundationContract = require("../artifacts/contracts/rentFoundation.sol/RentFoundation.json")
        let mockedRentFoundationContract = await deployMockContract(owner, rentFoundationContract.abi)
        await cToken.setRentFoundation(mockedRentFoundationContract.address)
        expect(await cToken.rentFoundation()).to.equal(mockedRentFoundationContract.address)
	})

    it("it is not possible to set RentFoundation contract (not owner contract)", async function () {
        let rentFoundationContract = require("../artifacts/contracts/rentFoundation.sol/RentFoundation.json")
        let mockedRentFoundationContract = await deployMockContract(owner, rentFoundationContract.abi)
        await expect(cToken.connect(acc1).setRentFoundation(mockedRentFoundationContract.address)).to.be.reverted
	})

    it("burn works", async function () {
		await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xTokenContractAddress.address)
		await cToken.connect(xTokenContractAddress).mint(acc1.address, 1000000)
        await mockedRentFoundationContract.mock.sellCToken.withArgs(acc1.address, 500000).returns()
        await cToken.connect(acc1).burn(500000)
        expect(await cToken.balanceOf(acc1.address)).to.equal(500000)
	})

    it("burn doesn't work impossible to exchange CTokens", async function () {
		await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xTokenContractAddress.address)
		await cToken.connect(xTokenContractAddress).mint(acc1.address, 1000000)
        await mockedRentFoundationContract.mock.sellCToken.withArgs(acc1.address, 500000).returns()
        await cToken.connect(acc1).burn(500000)
        expect(await cToken.balanceOf(acc1.address)).to.equal(500000)
	})

    it("burn doesn't work impossible to exchange CTokens", async function () {
		await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xTokenContractAddress.address)
		await cToken.connect(xTokenContractAddress).mint(acc1.address, 1000000)
        await mockedRentFoundationContract.mock.sellCToken.withArgs(acc1.address, 500000).reverted
        await expect(cToken.connect(acc1).burn(500000)).to.be.reverted
        expect(await cToken.balanceOf(acc1.address)).to.equal(1000000)
	})

    it("burn doesn't work impossible to exchange CTokens (not enaugh balance)", async function () {
		await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xTokenContractAddress.address)
		await cToken.connect(xTokenContractAddress).mint(acc1.address, 1000000)
        await mockedRentFoundationContract.mock.sellCToken.withArgs(acc1.address, 2000000).reverted
        await expect(cToken.connect(acc1).burn(2000000)).to.be.reverted
        expect(await cToken.balanceOf(acc1.address)).to.equal(1000000)
	})
})