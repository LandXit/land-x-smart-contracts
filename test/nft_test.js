const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let nft
let owner, acc1, acc2

describe("NFT", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		let NFTContract = await ethers.getContractFactory("LandXNFT")
		nft = await NFTContract.deploy()
		await nft.deployed()
	})

	it("simple test...", async function () {
		expect(await nft.owner()).to.equal(owner.address)
	})

	//TODO
	// it("buying one works", async function () {
	// 	await nft.setPriceAndMaxSupply(10, web3.utils.toWei("0.01", "ether"), 1)
	// 	expect(await nft.price(10)).to.equal(web3.utils.toWei("0.01", "ether"))
	// 	await nft.connect(acc1).buyNFT(10, { value: web3.utils.toWei("0.01", "ether") })
	// 	expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
	// })

	// it("can't buy with less money or over the max supply", async function () {
	// 	await nft.setPriceAndMaxSupply(10, web3.utils.toWei("0.01", "ether"), 2)
	// 	expect(await nft.price(10)).to.equal(web3.utils.toWei("0.01", "ether"))

	// 	await expectRevert.unspecified(
	// 		nft.connect(acc1).buyNFT(10, { value: web3.utils.toWei("0.009", "ether") })
	// 	)

	// 	await nft.connect(acc1).buyNFT(10, { value: web3.utils.toWei("0.01", "ether") })
	// 	await nft.connect(acc1).buyNFT(10, { value: web3.utils.toWei("0.01", "ether") })
	// 	expect(await nft.balanceOf(acc1.address, 10)).to.equal(2)

	// 	await expectRevert.unspecified(
	// 		nft.connect(acc1).buyNFT(10, { value: web3.utils.toWei("0.01", "ether") })
	// 	)
	// })

	// it("simple minting test", async function () {
	// 	await nft.setPriceAndMaxSupply(1, web3.utils.toWei("0.01", "ether"), 10)
	// 	expect(await nft.balanceOf(acc1.address, 1)).to.equal(0)
	// 	await nft.mint(acc1.address, 1, 1, 0x00)
	// 	expect(await nft.balanceOf(acc1.address, 1)).to.equal(1)
	// })

	// it("multiple minting test", async function () {
	// 	await nft.setPriceAndMaxSupply(1, web3.utils.toWei("0.01", "ether"), 10)
	// 	expect(await nft.balanceOf(acc1.address, 1)).to.equal(0)
	// 	await nft.mint(acc1.address, 1, 10, 0x00)
	// 	expect(await nft.balanceOf(acc1.address, 1)).to.equal(10)
	// })

	// it("changing the price setter works", async function () {
	// 	expect(await nft.priceSetter()).to.equal(owner.address)
	// 	await nft.setPriceSetter(acc1.address)
	// 	expect(await nft.priceSetter()).to.equal(acc1.address)
	// })

	// it("changing price works", async function () {
	// 	await nft.setPriceAndMaxSupply(10, web3.utils.toWei("0.01", "ether"), 10)
	// 	await nft.connect(acc1).buyNFT(10, { value: web3.utils.toWei("0.01", "ether") })
	// 	await nft.setPriceAndMaxSupply(10, web3.utils.toWei("0.02", "ether"), 10)
	// 	await nft.connect(acc1).buyNFT(10, { value: web3.utils.toWei("0.02", "ether") })
	// 	expect(await nft.balanceOf(acc1.address, 10)).to.equal(2)
	// })

	// it("withdraw monney works", async function () {
	// 	const tracker = await balance.tracker(owner.address)
	// 	let ownerInitialBalance = Number(await tracker.get("wei"))

	// 	await nft.setPriceAndMaxSupply(12, web3.utils.toWei("0.1", "ether"), 10)
	// 	await nft.connect(acc1).buyNFT(12, { value: web3.utils.toWei("0.1", "ether") })
	// 	await nft.connect(acc1).buyNFT(12, { value: web3.utils.toWei("0.1", "ether") })

	// 	await nft.withdraw()
	// 	let ownerFinalBalance = Number(await tracker.get("wei"))
	// 	expect(ownerFinalBalance - ownerInitialBalance).to.be.greaterThan(
	// 		Number(web3.utils.toWei("0.199", "ether")) //some gas costs are lost
	// 	)
	// })
})
