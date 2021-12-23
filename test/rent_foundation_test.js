const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")
const { keccak256, keccakFromString } = require("hardhat/node_modules/ethereumjs-util")

let wtc, rentFoudation

describe("Rent foundation", function () {
	beforeEach(async function () {
		[owner, acc1] = await ethers.getSigners()
		
		let ERC20MockContract = await ethers.getContractFactory("ERC20Mock")
		wtc = await ERC20MockContract.deploy("WTCMock", "WTC", 100000)
		await wtc.deployed()

		let RentFoundation = await ethers.getContractFactory("RentFoundation")
		rentFoudation = await RentFoundation.deploy(wtc.address, owner.address)
		await rentFoudation.deployed()

		await wtc.transfer(acc1.address, "10000")
		await wtc.transfer(rentFoudation.address, "10000")

		await wtc.connect(owner).increaseAllowance(rentFoudation.address, 99999999999999)
		await wtc.connect(acc1).increaseAllowance(rentFoudation.address, 99999999999999)
	})

	it("Error when pay rent if rent is not collected for a NFT token", async function () {
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
		expect(await wtc.balanceOf(rentFoudation.address)).to.equal(10000)

		await expect(rentFoudation.connect(acc1).payRent(1, 5000)).to.be.revertedWith(
			"Initial rent was not applied"
		)

		expect(await wtc.balanceOf(rentFoudation.address)).to.equal(10000)
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)

		expect(await rentFoudation.initialRentApplied(1)).to.equal(false)
	})

	it("Pay rent", async function () {
		role = keccakFromString("INITIAL_RENT_PAYER_ROLE");
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
		expect(await wtc.balanceOf(rentFoudation.address)).to.equal(10000)

		await rentFoudation.connect(owner).grantRole(role, owner.address)
		await rentFoudation.connect(owner).payInitialRent(1, 5000)

		expect(await rentFoudation.connect(acc1).payRent(1, 5000))

		expect(await wtc.balanceOf(rentFoudation.address)).to.equal(20000)
		expect(await wtc.balanceOf(acc1.address)).to.equal(5000)

		expect(await rentFoudation.initialRentApplied(1)).to.equal(true)
		expect(await rentFoudation.rentPaidAmount()).to.equal(10000)
	})

	it("Error when pay initial rent (wrong role)", async function () {
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
		expect(await wtc.balanceOf(rentFoudation.address)).to.equal(10000)

		await expect(rentFoudation.connect(owner).payInitialRent(1, 5000)).to.be.revertedWith("not initial payer")

		expect(await wtc.balanceOf(rentFoudation.address)).to.equal(10000)
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)

		expect(await rentFoudation.rentPaidAmount()).to.equal(0)
	})

	it("Error when pay initial rent (initial ren was already applied)", async function () {
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
		expect(await wtc.balanceOf(rentFoudation.address)).to.equal(10000)

		await rentFoudation.connect(owner).grantRole(role, owner.address)
		await rentFoudation.connect(owner).payInitialRent(1, 5000)

		await expect(rentFoudation.connect(owner).payInitialRent(1, 5000)).to.be.revertedWith("Initial Paymant already applied")

		expect(await wtc.balanceOf(rentFoudation.address)).to.equal(15000)
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)

		expect(await rentFoudation.rentPaidAmount()).to.equal(5000)
	})

	
})
