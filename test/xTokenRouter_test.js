const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants } = require("ethers");
const { ethers } = require("hardhat")

let xTokenRouter
let owner, acc1
let mockedXTokenContract, mockedCTokenContract

describe("cToken", function () {
	beforeEach(async function () {
		;[owner, acc1] = await ethers.getSigners()
		const xTokenContract = require("../artifacts/contracts/xToken.sol/XToken.json")
		mockedXTokenContract = await deployMockContract(owner, xTokenContract.abi)
		const cTokenContract = require("../artifacts/contracts/cToken.sol/CToken.json")
		mockedCTokenContract = await deployMockContract(owner, cTokenContract.abi)
		let xTokenRouterContract = await ethers.getContractFactory("xTokenRouter")
		xTokenRouter = await xTokenRouterContract.deploy()
		await xTokenRouter.deployed()
	})

	it("Set Tokens works", async function () {
		await xTokenRouter.setToken("SOY", mockedXTokenContract.address, mockedCTokenContract.address)
        expect(await xTokenRouter.getXToken("SOY")).to.equal(mockedXTokenContract.address)
        expect(await xTokenRouter.getCToken("SOY")).to.equal(mockedCTokenContract.address)
	})

    it("not owner can't set Tokens", async function () {
		await expect(xTokenRouter.connect(acc1).setToken("SOY", mockedXTokenContract.address, mockedCTokenContract.address)).to.be.reverted
        expect(await xTokenRouter.getXToken("SOY")).to.equal(constants.AddressZero)
        expect(await xTokenRouter.getCToken("SOY")).to.equal(constants.AddressZero)
	})

	it("get cToken", async function () {
		await xTokenRouter.setToken("SOY", mockedXTokenContract.address, mockedCTokenContract.address)
        expect(await xTokenRouter.getCToken("SOY")).to.equal(mockedCTokenContract.address)
	})
})