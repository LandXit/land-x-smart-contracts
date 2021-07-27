const { expect } = require("chai")
const { ethers } = require("hardhat")

let wtc
let owner, acc1, acc2

describe("ERC20", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		let WTCContract = await ethers.getContractFactory("WTC")
		wtc = await WTCContract.deploy(owner.address)
		await wtc.deployed()

		await wtc.mint(acc1.address, "1000")
	})

	it("simple test...", async function () {
		expect(await wtc.owner()).to.equal(owner.address)
	})

	it("adding/removing to blacklist works", async function () {
		expect(await wtc.blacklist(acc1.address)).to.equal(false)
		await wtc.setBlacklist(acc1.address, true)
		expect(await wtc.blacklist(acc1.address)).to.equal(true)
		await wtc.setBlacklist(acc1.address, false)
		expect(await wtc.blacklist(acc1.address)).to.equal(false)
	})

	it("transfer when not in blacklist works", async function () {
		await wtc.connect(acc1).transfer(acc2.address, "100")
	})

	it("transfer blocks when blacklisted: sender", async function () {
		expect(await wtc.blacklist(acc1.address)).to.equal(false)
		await wtc.setBlacklist(acc1.address, true)
		await await expect(wtc.connect(acc1).transfer(acc2.address, "100")).to.be.revertedWith(
			"sender is blacklisted"
		)
	})

	it("transfer blocks when blacklisted: recipient", async function () {
		await wtc.setBlacklist(acc2.address, true)
		await await expect(wtc.connect(acc1).transfer(acc2.address, "100")).to.be.revertedWith(
			"recipient is blacklisted"
		)
	})
})
