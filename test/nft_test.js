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

	it("buying one works", async function () {
		//uint256 _index, uint256 _maxSupply, uint256 _price, uint256 _landArea, uint256 _yield
		await nft.setTokenDetails(10, 1, 1000, 10, 999)
		expect(await nft.price(10)).to.equal(1000)
		await nft.connect(acc1).buyNFT(10)
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
	})

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

// let nft
// let trail
// let owner, acc1, acc2, acc3

// describe("NFT", function () {
// 	beforeEach(async function () {
// 		let TRAILMockC = await ethers.getContractFactory("ERC20Mock")
// 		trail = await TRAILMockC.deploy("TRAIL", "TRAIL", web3.utils.toWei("300", "ether"))
// 		await trail.deployed()

// 		signers = await ethers.getSigners()
// 		owner = signers[0]
// 		acc1 = signers[1]
// 		acc2 = signers[2]
// 		acc3 = signers[3]

// 		let NFTContract = await ethers.getContractFactory("PolkatrailNFT")
// 		nft = await NFTContract.deploy(trail.address)
// 		await nft.deployed()

// 		//each account starts with 100 TRAIL
// 		await trail.transfer(acc1.address, web3.utils.toWei("100", "ether"))
// 		await trail.transfer(acc2.address, web3.utils.toWei("100", "ether"))
// 		await trail.increaseAllowance(nft.address, web3.utils.toWei("9999999", "ether"))
// 		await trail.connect(acc1).increaseAllowance(nft.address, web3.utils.toWei("9999999", "ether"))
// 		await trail.connect(acc2).increaseAllowance(nft.address, web3.utils.toWei("9999999", "ether"))
// 	})

// 	it("withdraw trail tax works", async function () {
// 		let balanceTrailBeforeOwner = await trail.balanceOf(owner.address)

// 		await nft.setTokenDetails(10, web3.utils.toWei("1", "ether"), 1, acc1.address)
// 		await nft.connect(acc2).buyNFT(10)

// 		await expectRevert.unspecified(nft.reclaimToken(trail.address, web3.utils.toWei("1", "ether")))

// 		await nft.reclaimToken(trail.address, web3.utils.toWei("0.9", "ether"))
// 		let balanceTrailAfterOwner = await trail.balanceOf(owner.address)

// 		expect(Number(balanceTrailAfterOwner - balanceTrailBeforeOwner)).to.equal(
// 			Number(web3.utils.toWei("0.9", "ether"))
// 		)
// 	})

// 	it("artists get 90% of the sale", async function () {
// 		//	uint256 _index, uint256 _price,	uint256 _maxSupply, address _artist
// 		await nft.setTokenDetails(10, web3.utils.toWei("10", "ether"), 1, acc1.address)
// 		expect(await nft.price(10)).to.equal(web3.utils.toWei("10", "ether"))
// 		await expectRevert.unspecified(nft.connect(acc1).artistWithdrawal()) //can't withdraw with 0 balance
// 		await nft.connect(acc2).buyNFT(10)
// 		expect(await nft.balanceOf(acc2.address, 10)).to.equal(1)
// 		expect(await nft.revenuePerArtist(acc1.address)).to.equal(web3.utils.toWei("9", "ether"))
// 		expect(await trail.balanceOf(nft.address)).to.equal(web3.utils.toWei("10", "ether"))
// 		let balanceTrailBefore = await trail.balanceOf(acc1.address)
// 		await nft.connect(acc1).artistWithdrawal()
// 		expect(Number(await trail.balanceOf(nft.address))).to.equal(
// 			Number(web3.utils.toWei("1", "ether")) //10% tax
// 		)
// 		let balanceTrailAfter = await trail.balanceOf(acc1.address) //90% tax
// 		expect(Number(balanceTrailAfter - balanceTrailBefore)).to.equal(
// 			Number(web3.utils.toWei("9", "ether"))
// 		)
// 	})

// 	it("artists get 90% of the sale. part 2", async function () {
// 		//	uint256 _index, uint256 _price,	uint256 _maxSupply, address _artist
// 		await nft.setTokenDetails(10, web3.utils.toWei("10", "ether"), 1, acc1.address)
// 		await nft.setTokenDetails(11, web3.utils.toWei("10", "ether"), 1, acc1.address)

// 		await nft.connect(acc2).buyNFT(10)
// 		await nft.connect(acc2).buyNFT(11)
// 		expect(await nft.balanceOf(acc2.address, 10)).to.equal(1)
// 		expect(await nft.balanceOf(acc2.address, 11)).to.equal(1)

// 		let balanceTrailBefore = await trail.balanceOf(acc1.address)
// 		await nft.connect(acc1).artistWithdrawal()
// 		expect(Number(await trail.balanceOf(nft.address))).to.equal(
// 			Number(web3.utils.toWei("2", "ether")) //10% tax
// 		)
// 		let balanceTrailAfter = await trail.balanceOf(acc1.address) //90% tax
// 		expect(Number(balanceTrailAfter - balanceTrailBefore)).to.equal(
// 			Number(web3.utils.toWei("18", "ether"))
// 		)
// 	})

// 	it("simple test...", async function () {
// 		expect(await nft.trailToken()).to.equal(trail.address)
// 	})

// 	it("changing the details setter works", async function () {
// 		expect(await nft.detailsSetter()).to.equal(owner.address)
// 		await nft.setDetailsSetter(acc1.address)
// 		expect(await nft.detailsSetter()).to.equal(acc1.address)
// 	})

// 	it("buying one works", async function () {
// 		//	uint256 _index, uint256 _price,	uint256 _maxSupply, address _artist
// 		await nft.setTokenDetails(10, 1000, 1, acc1.address)
// 		expect(await nft.price(10)).to.equal(1000)
// 		await nft.connect(acc1).buyNFT(10)
// 		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
// 	})

// 	it("can't buy with less money or over the max supply", async function () {
// 		await nft.setTokenDetails(10, web3.utils.toWei("101", "ether"), 1, acc1.address)
// 		expect(await nft.price(10)).to.equal(web3.utils.toWei("101", "ether"))

// 		await expectRevert.unspecified(nft.connect(acc1).buyNFT(10))

// 		await nft.setTokenDetails(10, web3.utils.toWei("10", "ether"), 1, acc1.address)

// 		await nft.connect(acc2).buyNFT(10)
// 		expect(await nft.balanceOf(acc2.address, 10)).to.equal(1)

// 		await expectRevert.unspecified(nft.connect(acc1).buyNFT(10))
// 	})

// 	it("simple minting test from owner", async function () {
// 		await nft.setTokenDetails(1, web3.utils.toWei("0.01", "ether"), 10, acc1.address)
// 		expect(await nft.balanceOf(acc1.address, 1)).to.equal(0)
// 		await nft.mint(acc1.address, 1, 1, 0x00)
// 		expect(await nft.balanceOf(acc1.address, 1)).to.equal(1)
// 	})
// })
