const { expect } = require("chai")
const { ethers } = require("hardhat")

let wtc
let owner, acc1, acc2

describe("ERC20", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		let WTCContract = await ethers.getContractFactory("WTC")
		wtc = await WTCContract.deploy(owner.address)
		await let.deployed()
	})

	it("simple test...", async function () {
		expect(await let.owner()).to.equal(owner.address)
	})
})
