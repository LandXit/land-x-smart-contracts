const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let ah //auctionHouse
let nft, wtc, usdc
let owner, acc1, acc2

describe("Auction House 4 (offers)", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		let NFTContract = await ethers.getContractFactory("LandXNFT")
		nft = await NFTContract.deploy()
		await nft.deployed()

		let ERC20MockContract = await ethers.getContractFactory("ERC20Mock")
		wtc = await ERC20MockContract.deploy("wtcMock", "wtc", "100000")
		await wtc.deployed()

		usdc = await ERC20MockContract.deploy("USDCMock", "USDC", "100000")
		await usdc.deployed()

		let AuctionHouseContract = await ethers.getContractFactory("AuctionHouse")
		//address _landxNFT, address _wtc, address _usdc
		ah = await AuctionHouseContract.deploy(nft.address, wtc.address, usdc.address)
		await ah.deployed()

		//mint some NFT Tokens
		//uint256 _index, uint256 _landArea, uint256 _rent, address _to
		await nft.setDetailsAndMint(9, 3000000, 300, owner.address)
		await nft.setDetailsAndMint(10, 3000000, 300, acc1.address)
		await nft.setDetailsAndMint(11, 3000000, 300, acc2.address)

		//setApprovalForAll
		await nft.connect(owner).setApprovalForAll(ah.address, true)
		await nft.connect(acc1).setApprovalForAll(ah.address, true)
		await nft.connect(acc2).setApprovalForAll(ah.address, true)

		//transfer some currencies
		await wtc.transfer(acc1.address, "10000")
		await wtc.transfer(acc2.address, "10000")
		await usdc.transfer(acc1.address, "10000")
		await usdc.transfer(acc2.address, "10000")

		//set allowance for the AuctionHouse
		await wtc.connect(owner).increaseAllowance(ah.address, 99999999999999)
		await wtc.connect(acc1).increaseAllowance(ah.address, 99999999999999)
		await wtc.connect(acc2).increaseAllowance(ah.address, 99999999999999)

		await usdc.connect(owner).increaseAllowance(ah.address, 99999999999999)
		await usdc.connect(acc1).increaseAllowance(ah.address, 99999999999999)
		await usdc.connect(acc2).increaseAllowance(ah.address, 99999999999999)
	})

	it("simple test...", async function () {
		expect(await ah.sellsCount()).to.equal(0)
	})

	it("you can't make offer because too big duration", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
	
		await expect(ah.connect(acc1).makeOffer(11, 50, 0, 1, 15552001)).to.be.revertedWith("too long duration")
	})

	it("you can't make offer because invalid listing", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
	
		await expect(ah.connect(acc1).makeOffer(11, 50, 0, 1, 56500)).to.be.revertedWith("token has no active listings")
	})

	it("you can't make offer because auction is expired", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
		await time.increase(time.duration.seconds(86420))

		await expect(ah.connect(acc1).makeOffer(11, 50, 0, 0, 56500)).to.be.revertedWith("token has no active listings")
	})

	it("you can make offer", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
	
		await ah.connect(acc1).makeOffer(11, 50, 0, 0, 56500)
		expect(await ah.offersCount()).to.equal(1)
	})

	it("maker can cancel offer", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
	
		await ah.connect(acc1).makeOffer(11, 50, 0, 0, 56500)
		await ah.connect(acc1).cancelOffer(0)
		offer = await ah.offers(0)
		expect(offer.actual).to.equal(false)
	})

	it("seller can decline offer", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
	
		await ah.connect(acc1).makeOffer(11, 50, 0, 0, 56500)
		await ah.connect(acc2).declineOffer(0)
		offer = await ah.offers(0)
		expect(offer.actual).to.equal(false)
	})

	it("non-seller can't decline offer", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
	
		await ah.connect(acc1).makeOffer(11, 50, 0, 0, 56500)
		await expect(ah.connect(acc1).declineOffer(0)).to.be.revertedWith("only seller can decline offer")
	})

	it("you can't cancel offer", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
	
		await ah.connect(acc1).makeOffer(11, 50, 0, 0, 56500)
		await expect(ah.connect(acc3).cancelOffer(0)).to.be.revertedWith("only maker can cancel offer")
	})

	it("you can accept offer", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
	
		await ah.connect(acc1).makeOffer(11, 100, 0, 0, 56500)

		await ah.connect(acc2).acceptOffer(0)

		expect(Number(await wtc.balanceOf(acc2.address))).to.equal(10097)
		expect(Number(await wtc.balanceOf(ah.address))).to.equal(3) // fee = 3

		expect(await nft.balanceOf(acc1.address, 11)).to.equal(1)
		expect(Number(await wtc.balanceOf(acc1.address))).to.equal(9900)
	})

	it("you can't accept expired offer", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 86400, 0)
	
		await ah.connect(acc1).makeOffer(11, 100, 0, 0, 56500)
		await time.increase(time.duration.seconds(56550))

		await expect(ah.connect(acc2).acceptOffer(0)).to.be.revertedWith("offer is expired")
	})
})
