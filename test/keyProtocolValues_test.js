const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants } = require("ethers");
const { ethers } = require("hardhat")

let keyProtocolValues
let owner, dao, hedgeFundWallet, landxOperationalWallet, landxChoiceWallet, xTokensSecurityWallet, validatorCommisionWallet
describe("Key Protocol Values", function () {
	beforeEach(async function () {
		;[owner, dao, hedgeFundWallet, landxOperationalWallet, landxChoiceWallet, xTokensSecurityWallet, validatorCommisionWallet] = await ethers.getSigners()
		let keyProtocolValuesContract = await ethers.getContractFactory("KeyProtocolVariables")
		keyProtocolValues = await keyProtocolValuesContract.deploy(
			dao.address, 
			hedgeFundWallet.address, 
			landxOperationalWallet.address, 
			landxChoiceWallet.address, 
			xTokensSecurityWallet.address, 
			validatorCommisionWallet.address
		)
		await keyProtocolValues.deployed()
	})

	it("updateXTokenMintFee works", async function () {
        await keyProtocolValues.connect(dao).updateXTokenMintFee(400)
		expect(await keyProtocolValues.xTokenMintFee()).to.equal(400)
	})

	it("updateXTokenMintFee doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateXTokenMintFee(400)).to.be.revertedWith("only dao can change value")
	})

	it("updateCTokenSellFee works", async function () {
        await keyProtocolValues.connect(dao).updateCTokenSellFee(800)
		expect(await keyProtocolValues.cTokenSellFee()).to.equal(800)
	})

	it("updateCTokenSellFee doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateCTokenSellFee(800)).to.be.revertedWith("only dao can change value")
	})

	it("updatePayRentFee works", async function () {
        await keyProtocolValues.connect(dao).updatePayRentFee(200)
		expect(await keyProtocolValues.payRentFee()).to.equal(200)
	})

	it("updatePayRentFee doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updatePayRentFee(200)).to.be.revertedWith("only dao can change value")
	})

	it("updateHedgeFundAllocation works", async function () {
        await keyProtocolValues.connect(dao).updateHedgeFundAllocation(1000)
		expect(await keyProtocolValues.hedgeFundAllocation()).to.equal(1000)
	})

	it("updateHedgeFundAllocation doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateHedgeFundAllocation(1000)).to.be.revertedWith("only dao can change value")
	})

	it("updateSecurityDepositMonths works", async function () {
        await keyProtocolValues.connect(dao).updateSecurityDepositMonths(10)
		expect(await keyProtocolValues.securityDepositMonths()).to.equal(10)
	})

	it("updateSecurityDepositMonths doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateSecurityDepositMonths(10)).to.be.revertedWith("only dao can change value")
	})

	it("updateMaxAllowableCropShare works", async function () {
        await keyProtocolValues.connect(dao).updateMaxAllowableCropShare("SOY", 1500)
		expect(await keyProtocolValues.maxAllowableCropShare("SOY")).to.equal(1500)
	})

	it("updateMaxAllowableCropShare doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateMaxAllowableCropShare("SOY", 1500)).to.be.revertedWith("only dao can change value")
	})

	it("updateFeeDistributionPercentage works", async function () {
        await keyProtocolValues.connect(dao).updateFeeDistributionPercentage(3000, 1500)
		expect(await keyProtocolValues.lndxHoldersPercentage()).to.equal(3000)
		expect(await keyProtocolValues.landXOpertationsPercentage()).to.equal(1500)
		expect(await keyProtocolValues.landXChoicePercentage()).to.equal(5500)
	})

	it("updateFeeDistributionPercentage doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateFeeDistributionPercentage(3000, 1500)).to.be.revertedWith("only dao can change value")
	})

	it("updateFeeDistributionPercentage doesn't work (inconsistent values)", async function () {
        expect(keyProtocolValues.connect(dao).updateFeeDistributionPercentage(9000, 1500)).to.be.revertedWith("inconsistent values")
	})

	it("updateHedgeFundWallet works", async function () {
        await keyProtocolValues.connect(dao).updateHedgeFundWallet(owner.address)
		expect(await keyProtocolValues.hedgeFundWallet()).to.equal(owner.address)
	})

	it("updateHedgeFundWallet doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateHedgeFundWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("updateLandxOperationalWallet works", async function () {
        await keyProtocolValues.connect(dao).updateLandxOperationalWallet(owner.address)
		expect(await keyProtocolValues.landxOperationalWallet()).to.equal(owner.address)
	})

	it("updateLandxOperationalWallet doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateLandxOperationalWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("updateLandxChoiceWallet works", async function () {
        await keyProtocolValues.connect(dao).updateLandxChoiceWallet(owner.address)
		expect(await keyProtocolValues.landxChoiceWallet()).to.equal(owner.address)
	})

	it("updateLandxChoiceWallet doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateLandxChoiceWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("updateXTokensSecurityWallet works", async function () {
        await keyProtocolValues.connect(dao).updateXTokensSecurityWallet(owner.address)
		expect(await keyProtocolValues.xTokensSecurityWallet()).to.equal(owner.address)
	})

	it("updateXTokensSecurityWallet doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateXTokensSecurityWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("updateValidatorCommisionWallet works", async function () {
        await keyProtocolValues.connect(dao).updateValidatorCommisionWallet(owner.address)
		expect(await keyProtocolValues.validatorCommisionWallet()).to.equal(owner.address)
	})

	it("updateValidatorCommisionWallet doesn't work (not dao)", async function () {
        expect(keyProtocolValues.updateValidatorCommisionWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("launch works", async function () {
        await keyProtocolValues.connect(dao).launch()
		expect(await keyProtocolValues.preLaunch()).to.equal(false)
	})

	it("launch doesn't work (not dao)", async function () {
        expect(keyProtocolValues.launch()).to.be.revertedWith("only dao can change value")
	})
})