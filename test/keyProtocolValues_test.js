const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants } = require("ethers");
const { ethers } = require("hardhat")

let keyProtocolValues
let owner, dao, hedgeFundWallet, landxOperationalWallet, landxChoiceWallet, xTokensSecurityWallet, validatorCommisionWallet
describe("Key Protocol Values", function () {
	beforeEach(async function () {
		console.log("", '\n')
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
		console.log("updates xToken mint fee")
        await keyProtocolValues.connect(dao).updateXTokenMintFee(400)
		expect(await keyProtocolValues.xTokenMintFee()).to.equal(400)
	})

	it("updateXTokenMintFee doesn't work (not dao)", async function () {
		console.log("try to update xToken mint fee when it is not allowed")
        expect(keyProtocolValues.updateXTokenMintFee(400)).to.be.revertedWith("only dao can change value")
	})

	it("updateXTokenMintFee doesn't work (unsuitable value)", async function () {
        expect(keyProtocolValues.connect(dao).updateXTokenMintFee(10001)).to.be.revertedWith("value can't be above 100%")
	})

	it("updateCTokenSellFee works", async function () {
		console.log("updates cToken sell fee ")
        await keyProtocolValues.connect(dao).updateCTokenSellFee(800)
		expect(await keyProtocolValues.cTokenSellFee()).to.equal(800)
	})

	it("updateCTokenSellFee doesn't work (not dao)", async function () {
		console.log("try to update cToken sell fee when it is not allowed")
        expect(keyProtocolValues.updateCTokenSellFee(800)).to.be.revertedWith("only dao can change value")
	})

	it("updateCTokenSellFee doesn't work (unsuitable value)", async function () {
        expect(keyProtocolValues.connect(dao).updateCTokenSellFee(10001)).to.be.revertedWith("value can't be above 100%")
	})

	it("updatePayRentFee works", async function () {
		console.log("updates pay rent fee")
        await keyProtocolValues.connect(dao).updatePayRentFee(200)
		expect(await keyProtocolValues.payRentFee()).to.equal(200)
	})

	it("updatePayRentFee doesn't work (not dao)", async function () {
		console.log("try to update pay rent fee when it is not allowed")
        expect(keyProtocolValues.updatePayRentFee(200)).to.be.revertedWith("only dao can change value")
	})

	it("updatePayRentFee doesn't work (unsuitable value)", async function () {
        expect(keyProtocolValues.connect(dao).updatePayRentFee(10001)).to.be.revertedWith("value can't be above 100%")
	})

	it("updateSellXTokenSlippage works", async function () {
		console.log("updates pay rent fee")
        await keyProtocolValues.connect(dao).updateSellXTokenSlippage(200)
		expect(await keyProtocolValues.sellXTokenSlippage()).to.equal(200)
	})

	it("updateSellXTokenSlippage doesn't work (not dao)", async function () {
		console.log("try to update pay rent fee when it is not allowed")
        expect(keyProtocolValues.updateSellXTokenSlippage(200)).to.be.revertedWith("only dao can change value")
	})

	it("updateSellXTokenSlippage doesn't work (unsuitable value)", async function () {
        expect(keyProtocolValues.connect(dao).updateSellXTokenSlippage(10001)).to.be.revertedWith("value can't be above 100%")
	})

	it("updateBuyXTokenSlippage works", async function () {
		console.log("updates pay rent fee")
        await keyProtocolValues.connect(dao).updateBuyXTokenSlippage(200)
		expect(await keyProtocolValues.buyXTokenSlippage()).to.equal(200)
	})

	it("updateBuyXTokenSlippage doesn't work (not dao)", async function () {
		console.log("try to update pay rent fee when it is not allowed")
        expect(keyProtocolValues.updateBuyXTokenSlippage(200)).to.be.revertedWith("only dao can change value")
	})

	it("updateBuyXTokenSlippage doesn't work (unsuitable value)", async function () {
        expect(keyProtocolValues.connect(dao).updateBuyXTokenSlippage(10001)).to.be.revertedWith("value can't be above 100%")
	})

	it("updateHedgeFundAllocation works", async function () {
		console.log("updates hedge fund allocation percentage to 10%")
        await keyProtocolValues.connect(dao).updateHedgeFundAllocation(1000)
		expect(await keyProtocolValues.hedgeFundAllocation()).to.equal(1000)
	})

	it("updateHedgeFundAllocation doesn't work (not dao)", async function () {
		console.log("try to update  hedge fund allocation percentage when it is not allowed")
        expect(keyProtocolValues.updateHedgeFundAllocation(1000)).to.be.revertedWith("only dao can change value")
	})

	it("updateHedgeFundAllocation doesn't work (unsuitable value)", async function () {
        expect(keyProtocolValues.connect(dao).updateHedgeFundAllocation(10001)).to.be.revertedWith("value can't be above 100%")
	})

	it("updateSecurityDepositMonths works", async function () {
		console.log("updates size of security deposit")
        await keyProtocolValues.connect(dao).updateSecurityDepositMonths(10)
		expect(await keyProtocolValues.securityDepositMonths()).to.equal(10)
	})

	it("updateSecurityDepositMonths doesn't work (not dao)", async function () {
		console.log("try to update size of security deposit when it is not allowed")
        expect(keyProtocolValues.updateSecurityDepositMonths(10)).to.be.revertedWith("only dao can change value")
	})

	it("updateFeeDistributionPercentage works", async function () {
		console.log("updates fee distribution precentages")
        await keyProtocolValues.connect(dao).updateFeeDistributionPercentage(3000, 1500)
		expect(await keyProtocolValues.lndxHoldersPercentage()).to.equal(3000)
		expect(await keyProtocolValues.landXOperationsPercentage()).to.equal(1500)
		expect(await keyProtocolValues.landXChoicePercentage()).to.equal(5500)
	})

	it("updateFeeDistributionPercentage doesn't work (not dao)", async function () {
		console.log("try to update fee distribution precentages when it is not allowed")
        expect(keyProtocolValues.updateFeeDistributionPercentage(3000, 1500)).to.be.revertedWith("only dao can change value")
	})

	it("updateFeeDistributionPercentage doesn't work (inconsistent values)", async function () {
		console.log("try to update fee distribution precentages when their sum is greater then 100%")
        expect(keyProtocolValues.connect(dao).updateFeeDistributionPercentage(9000, 1500)).to.be.revertedWith("inconsistent values")
	})

	it("updateHedgeFundWallet works", async function () {
		console.log("updates hedge fund wallet")
        await keyProtocolValues.connect(dao).updateHedgeFundWallet(owner.address)
		expect(await keyProtocolValues.hedgeFundWallet()).to.equal(owner.address)
	})

	it("updateHedgeFundWallet doesn't work (not dao)", async function () {
		console.log("try to update hedge fund wallet when it is not allowed")
        expect(keyProtocolValues.updateHedgeFundWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("updateHedgeFundWallet doesn't work (zero address)", async function () {
        expect(keyProtocolValues.connect(dao).updateHedgeFundWallet(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

	it("updateLandxOperationalWallet works", async function () {
		console.log("updates landx operational wallet")
        await keyProtocolValues.connect(dao).updateLandxOperationalWallet(owner.address)
		expect(await keyProtocolValues.landxOperationalWallet()).to.equal(owner.address)
	})

	it("updateLandxOperationalWallet doesn't work (not dao)", async function () {
		console.log("try to update landx operational wallet when it is not allowed")
        expect(keyProtocolValues.updateLandxOperationalWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("updateLandxOperationalWallet doesn't work (zero address)", async function () {
        expect(keyProtocolValues.connect(dao).updateLandxOperationalWallet(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

	it("updateLandxChoiceWallet works", async function () {
		console.log("updates landx choice wallet")
        await keyProtocolValues.connect(dao).updateLandxChoiceWallet(owner.address)
		expect(await keyProtocolValues.landxChoiceWallet()).to.equal(owner.address)
	})

	it("updateLandxChoiceWallet doesn't work (not dao)", async function () {
		console.log("try to update landx choice wallet when it is not allowed")
        expect(keyProtocolValues.updateLandxChoiceWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("updateLandxChoiceWallet doesn't work (zero address)", async function () {
        expect(keyProtocolValues.connect(dao).updateLandxChoiceWallet(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

	it("updateXTokensSecurityWallet works", async function () {
		console.log("updates xToken security wallet")
        await keyProtocolValues.connect(dao).updateXTokensSecurityWallet(owner.address)
		expect(await keyProtocolValues.xTokensSecurityWallet()).to.equal(owner.address)
	})

	it("updateXTokensSecurityWallet doesn't work (not dao)", async function () {
		console.log("try to update xToken security wallet when it is not allowed")
        expect(keyProtocolValues.updateXTokensSecurityWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("updateXTokensSecurityWallet doesn't work (zero address)", async function () {
        expect(keyProtocolValues.connect(dao).updateXTokensSecurityWallet(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

	it("updateValidatorCommisionWallet works", async function () {
		console.log("updates validator's commission wallet")
        await keyProtocolValues.connect(dao).updateValidatorCommisionWallet(owner.address)
		expect(await keyProtocolValues.validatorCommisionWallet()).to.equal(owner.address)
	})

	it("updateValidatorCommisionWallet doesn't work (not dao)", async function () {
		console.log("try to update validator's commission wallet when it is not allowed")
        expect(keyProtocolValues.updateValidatorCommisionWallet(owner.address)).to.be.revertedWith("only dao can change value")
	})

	it("updateValidatorCommisionWallet doesn't work (zero address)", async function () {
        expect(keyProtocolValues.connect(dao).updateValidatorCommisionWallet(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

	it("updateMaxValidatorFee works", async function () {
		console.log("updates max validator fee")
        await keyProtocolValues.connect(dao).updateMaxValidatorFee(800)
		expect(await keyProtocolValues.maxValidatorFee()).to.equal(800)
	})

	it("updateMaxValidatorFee doesn't work (not dao)", async function () {
		console.log("try to updates max validator fee when it is not allowed")
        expect(keyProtocolValues.updateMaxValidatorFee(800)).to.be.revertedWith("only dao can change value")
	})

	it("updateMaxValidatorFee doesn't work (unsuitable value)", async function () {
        expect(keyProtocolValues.connect(dao).updateMaxValidatorFee(10001)).to.be.revertedWith("value can't be above 100%")
	})

	it("update validator commision fee works", async function () {
		console.log("update validator commision fee")
        await keyProtocolValues.connect(dao).updateValidatorCommission(800)
		expect(await keyProtocolValues.validatorCommission()).to.equal(800)
	})

	it("update validator commision fee doesn't work (not dao)", async function () {
		console.log("try to update validator commision fee when it is not allowed")
        expect(keyProtocolValues.updateValidatorCommission(800)).to.be.revertedWith("only dao can change value")
	})

	it("update validator commision fee doesn't work (unsuitable value)", async function () {
        expect(keyProtocolValues.connect(dao).updateValidatorCommission(10001)).to.be.revertedWith("value can't be above 100%")
	})

	it("launch works", async function () {
		console.log("disable pre launch mode")
        await keyProtocolValues.connect(dao).launch()
		expect(await keyProtocolValues.preLaunch()).to.equal(false)
	})

	it("launch doesn't work (not dao)", async function () {
		console.log("try to disable pre launch mode when it is not allowed")
        expect(keyProtocolValues.launch()).to.be.revertedWith("only dao can change value")
	})
})