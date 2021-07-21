const { expect } = require("chai")
const { ethers } = require("hardhat")
const { time, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let erc20
let owner, acc1, acc2

//note: test it with ganache
describe("Vesting", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		//deploy an erc20 token as WTC
		let ERC20MockContract = await ethers.getContractFactory("ERC20Mock")
		erc20 = await ERC20MockContract.deploy("WTCMock", "WTC", "100000")
		await erc20.deployed()

		let VestingContract = await ethers.getContractFactory("VestingWTC")
		vesting = await VestingContract.deploy(erc20.address)
		await vesting.deployed()
		await erc20.increaseAllowance(vesting.address, 99999999999999)
	})

	it("Deployment should be ok", async function () {
		expect(await vesting.token()).to.equal(erc20.address)
		expect(Number(await erc20.balanceOf(owner.address))).to.equal(100000)
	})

	it("should allow to create a grant", async function () {
		//recipient, amount, vesting, clif
		await vesting.addTokenGrant(acc1.address, 10, 10, 5)
		grantStartTime = Number(await vesting.getGrantStartTime(acc1.address))
		currentTime = Number(await time.latest())
		expect(grantStartTime).to.greaterThan(currentTime - 432000)
		expect(await vesting.getGrantAmount(acc1.address)).to.equal(10)
	})

	it("should allow to create multiple grants", async function () {
		await expect(vesting.addTokenGrant(acc1.address, 10, 10, 5)).to.emit(vesting, "GrantAdded")
		await expect(vesting.addTokenGrant(acc2.address, 100, 10, 5)).to.emit(vesting, "GrantAdded")
	})

	it("can't create more than the owner allowance", async function () {
		await expectRevert.unspecified(vesting.addTokenGrant(acc1.address, 9999999, 10, 5))
	})

	it("clif cant be greater than vesting", async function () {
		await expect(vesting.addTokenGrant(acc1.address, 10000, 365, 182)).to.emit(
			vesting,
			"GrantAdded"
		)
		await expect(vesting.addTokenGrant(acc2.address, 1, 365, 182)).to.be.revertedWith(
			"amountVestedPerDay > 0"
		)
	})

	it("you can't add the same grant twice", async function () {
		await expect(vesting.addTokenGrant(acc1.address, 100, 10, 5)).to.emit(vesting, "GrantAdded")
		await expect(vesting.addTokenGrant(acc1.address, 100, 10, 5)).to.be.revertedWith(
			"grant already exists"
		)
	})

	it("should not allow to withdraw prior to clif", async function () {
		await expect(vesting.addTokenGrant(acc1.address, 100, 10, 5)).to.emit(vesting, "GrantAdded")
		await time.increase(time.duration.minutes(60)) //too short
		await expect(vesting.connect(acc1).claimVestedTokens()).to.be.revertedWith("vested is 0")
	})

	it("should allow to withdraw full after the complete duration", async function () {
		expect(Number(await erc20.balanceOf(acc1.address))).to.equal(0)
		await expect(vesting.addTokenGrant(acc1.address, 100, 10, 5)).to.emit(vesting, "GrantAdded")
		await time.increase(time.duration.days(30)) //over vesting period
		await expect(vesting.connect(acc1).claimVestedTokens()).to.emit(vesting, "GrantTokensClaimed")
		expect(Number(await erc20.balanceOf(acc1.address))).to.equal(100)
	})

	it("should calculate correctly the clif", async function () {
		expect(Number(await erc20.balanceOf(acc1.address))).to.equal(0)
		await expect(vesting.addTokenGrant(acc1.address, 100, 10, 1)).to.emit(vesting, "GrantAdded")
		await time.increase(time.duration.days(5)) //over vesting period
		await expect(vesting.connect(acc1).claimVestedTokens()).to.emit(vesting, "GrantTokensClaimed")
		expect(Number(await erc20.balanceOf(acc1.address))).to.equal(50)
	})
})
