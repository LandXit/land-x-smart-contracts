const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let lndx
let owner, acc1, acc2

describe("ERC20", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		let LNDXContract = await ethers.getContractFactory("LNDX")
		lndx = await LNDXContract.deploy()
		await lndx.deployed()
	})

	it("simple test...", async function () {
		expect(await lndx.owner()).to.equal(owner.address)
	})
})
