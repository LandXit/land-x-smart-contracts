const { expect } = require("chai")
const { ethers } = require("hardhat")
const { BN, time, balance, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let staking
let owner, acc1, acc2
let WTC

describe("Deploy Staking", function () {
	beforeEach(async function () {
		let StakingC = await ethers.getContractFactory("Staking")

		signers = await ethers.getSigners()
		owner = signers[0]
		acc1 = signers[1]
		acc2 = signers[2]

		//deploy an WTC token for
		let WTCMockContract = await ethers.getContractFactory("ERC20Mock")
		WTC = await WTCMockContract.deploy("ShoppingIO", "WTC", toWTC("100000"))
		await WTC.deployed()

		//100000000000 = 0.1 WTC per 1 WTC staked 11days
		//10000000000 = 0.01 WTC per 1 WTC staked 11days
		staking = await StakingC.deploy(WTC.address, "100000000000")
		await staking.deployed()
		await WTC.increaseAllowance(staking.address, toWTC("100000"))

		//transfer WTC to acc1, acc2
		await WTC.transfer(acc1.address, toWTC("1000")) //1000 WTC
		await WTC.transfer(acc2.address, toWTC("2000")) //2000 WTC
		await WTC.connect(acc1).increaseAllowance(staking.address, toWTC("1000"))
		await WTC.connect(acc2).increaseAllowance(staking.address, toWTC("2000"))
	})

	it("deploys ok", async function () {
		expect(await WTC.balanceOf(staking.address)).to.equal(0)
	})

	it("can add rewards", async function () {
		expect(await WTC.balanceOf(staking.address)).to.equal(0)
		await expect(staking.addReward(toWTC("1000"))).to.emit(staking, "RewardAdded")
	})

	it("owner can withdraw rewards", async function () {
		await staking.addReward(toWTC("1000"))
		//owner can't withdraw WTC
		await expectRevert.unspecified(staking.reclaimToken(WTC.address, toWTC("300")))

		//owner can withdraw OTHER tokens sent by mistake
		let Erc20Mock = await ethers.getContractFactory("ERC20Mock")
		let erc20 = await Erc20Mock.deploy("Shitcoin", "SHI", toWTC("100"))
		await erc20.deployed()
		await erc20.transfer(acc1.address, toWTC("10"))
		await erc20.connect(acc1).increaseAllowance(staking.address, toWTC("10"))
		await erc20.transfer(staking.address, toWTC("5"))
		expect(await erc20.balanceOf(staking.address)).to.equal(toWTC("5"))
		//owner can withdraw them
		expect(await erc20.balanceOf(owner.address)).to.equal(toWTC("85"))
		await staking.reclaimToken(erc20.address, toWTC("5"))
		expect(await erc20.balanceOf(owner.address)).to.equal(toWTC("90"))
	})

	it("owner can change emission rate", async function () {
		await staking.changeEmissionRate(10)
		expect(await staking.emissionRate()).to.equal(10)
	})

	it("user can stake", async function () {
		await staking.addReward(1000)
		await staking.connect(acc1).stake(toWTC("1"))
		await staking.connect(acc2).stake(toWTC("2"))
	})

	it("user can claim their rewards", async function () {
		await staking.addReward(toWTC("1000"))
		//stake
		await staking.connect(acc1).stake(toWTC("1")) //1 WTC
		await staking.connect(acc2).stake(toWTC("2")) //2 WTC
		await time.increase(time.duration.seconds(1000000)) // ~11 days

		pbAcc1 = Number(await staking.pointsBalance(acc1.address)) / 1e18
		expect(pbAcc1).to.least(0.1)

		//claim acc1
		await staking.connect(acc1).claim()

		//balance of the acc1 is now: initial (1000-1) + claimed (~0.1)
		balanceAcc1 = Number(await WTC.balanceOf(acc1.address))
		expect(balanceAcc1).to.least(Number(toWTC("999")) + Number(toWTC("0.1")))
		expect(balanceAcc1).to.most(Number(toWTC("999")) + Number(toWTC("0.11")))

		//claim acc2
		await staking.connect(acc2).claim()

		//balance of the acc2 is now: initial (2000-2) + claimed (~0.2)
		balanceAcc2 = Number(await WTC.balanceOf(acc2.address))
		expect(balanceAcc2).to.least(Number(toWTC("1998")) + Number(toWTC("0.2")))
		expect(balanceAcc2).to.most(Number(toWTC("1998")) + Number(toWTC("0.23")))
	})

	it("user can unstake to get everything", async function () {
		await expect(staking.addReward(toWTC("1000"))).to.emit(staking, "RewardAdded")

		await staking.connect(acc1).stake(toWTC("1")) //stake 1 WTC
		await staking.connect(acc2).stake(toWTC("2")) //stake 2 WTC

		await time.increase(time.duration.seconds(1000000)) // ~11 days

		await staking.connect(acc1).unstake() //unstake acc1

		balanceAcc1 = Number(await WTC.balanceOf(acc1.address))
		//balance of the acc1 is now: initial (1000) + claimed (~0.1)
		expect(balanceAcc1).to.least(Number(toWTC("1000")) + Number(toWTC("0.1")))
		expect(balanceAcc1).to.most(Number(toWTC("1000")) + Number(toWTC("0.11")))

		await staking.connect(acc2).unstake() //unstake acc2

		//balance of the acc2 is now: initial (2000) + claimed (~0.2)
		balanceAcc2 = Number(await WTC.balanceOf(acc2.address))
		expect(balanceAcc2).to.least(Number(toWTC("2000")) + Number(toWTC("0.2")))
		expect(balanceAcc2).to.most(Number(toWTC("2000")) + Number(toWTC("0.23")))

		//rewards now are
		leftRewards = Number(await WTC.balanceOf(staking.address))
		expect(leftRewards).to.least(Number(toWTC("999.6"))) //- ~0.3 from previous
		expect(leftRewards).to.most(Number(toWTC("999.7")))
	})

	function toWTC(amount) {
		return ethers.utils.parseEther(amount)
	}
})
