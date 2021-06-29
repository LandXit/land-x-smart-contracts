const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let lndx
let owner, acc1, acc2

//note: test it with ganache
describe("NFT", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		//deploy an erc20 token as LNDX
		//deploy the vesting
	})

	it("Deployment should be ok", async function () {})

	it("should allow to create a grant", async function () {})

	it("should allow to create multiple grants", async function () {})

	it("can't create more than the owner allowance", async function () {})

	it("clif cant be greater than vesting", async function () {})

	it("you can't add the same grant twice", async function () {})

	it("should not allow to withdraw prior to clif", async function () {})

	it("should allow to withdraw full after the complete duration", async function () {
		//await time.increase(time.duration.days(30)) //use this to increase time
	})

	it("should calculate correctly the amounts after the cliff", async function () {})
})
