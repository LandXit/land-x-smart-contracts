const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let ah //auctionHouse
let nft, wtc, usdc
let owner, acc1, acc2

describe("Auction House 2 (auctioning)", function () {
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

	it("withdrawing money put in an lost auction", async function () {
		//initial balance acc1
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
		expect(await wtc.balanceOf(acc2.address)).to.equal(10000)
		expect(await nft.balanceOf(acc1.address, 11)).to.equal(0)

		//create auction ...owner
		//uint256 nftID, uint256 startPrice, uint256 reservedPrice, uint256 currency //0 - WTC, 1 - USDC
		await ah.connect(acc2).createAuction(11, 100, 101, 0)

		//acc1 bid
		await ah.connect(acc1).bid(0, "101")

		expect(await wtc.balanceOf(acc1.address)).to.equal(9899)

		//acc2 bid
		await ah.connect(owner).bid(0, "110")

		await ah.connect(acc1).withdrawRefunds(0)
		await ah.connect(acc1).withdrawRefunds(1)

		//acc1 should get it's money back
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
	})

	it("withdrawing an unsold item", async function () {
		expect(await nft.balanceOf(acc2.address, 11)).to.equal(1)
		await ah.connect(acc2).createAuction(11, 100, 101, 0)
		expect(await nft.balanceOf(acc2.address, 11)).to.equal(0)

		//one day passes
		await time.increase(time.duration.days(1))

		//no bids

		// claim prizes
		await ah.claim(0)

		//owner has the nft
		expect(await nft.balanceOf(acc2.address, 11)).to.equal(1)
	})

	it("you can't claim a pending auction", async function () {
		await ah.connect(acc2).createAuction(11, 100, 101, 0)
		await ah.connect(acc1).bid(0, "101")
		await time.increase(time.duration.minutes(60))
		await expect(ah.connect(acc1).claim(0)).to.be.revertedWith("ongoing auction")
	})

	it("you can't bid on an expired auction", async function () {
		//create auction ...acc2
		await ah.connect(acc2).createAuction(11, 100, 101, 0)
		// //bid on it, acc1
		//function bid(uint256 auctionId, uint256 bidAmount) public {
		await ah.connect(acc1).bid(0, "101")

		// //one day passes
		await time.increase(time.duration.days(1))
		const startingBlock = await time.latestBlock()
		const endBlock = startingBlock.addn(1)
		await time.advanceBlockTo(endBlock)

		await expect(ah.connect(owner).bid(0, "110")).to.be.revertedWith("auction expired")
	})

	it("reserved price is respected", async function () {
		await expect(ah.connect(acc2).createAuction(11, 100, 100, 0)).to.be.revertedWith(
			"reserve price > start price"
		)

		await ah.connect(acc2).createAuction(11, 99, 100, 0)

		expect(await ah.auctionCount()).to.equal(1)

		await expect(ah.connect(acc1).bid(0, 99)).to.be.revertedWith("reserved price not met")
	})

	it("bidding on an auction works", async function () {
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
		expect(await wtc.balanceOf(acc2.address)).to.equal(10000)
		expect(await nft.balanceOf(acc1.address, 11)).to.equal(0)

		//create auction ...acc2
		await ah.connect(acc2).createAuction(11, 99, 100, 0)

		expect(await ah.auctionCount()).to.equal(1)
		expect(await nft.balanceOf(ah.address, 11)).to.equal(1)

		// //bid on it, acc1
		//function bid(uint256 auctionId, uint256 bidAmount) public {
		await ah.connect(acc1).bid(0, "100")

		// //one day passes

		// time passes
		await time.increase(time.duration.days(1))
		const startingBlock = await time.latestBlock()
		const endBlock = startingBlock.addn(1)
		await time.advanceBlockTo(endBlock)

		// claim the nft after the auction end
		await ah.connect(acc1).claim(0)

		//acc1 has the nft
		expect(await nft.balanceOf(acc1.address, 11)).to.equal(1)
		//acc2 has the money
		expect(Number(await wtc.balanceOf(acc2.address))).to.equal(10100)
	})

	it("creating an auction works", async function () {
		//uint256 nftID,uint256 startPrice,uint256 currency //0 - wtc, 1 - usdc
		await ah.createAuction(9, 10, 11, 0)
		expect(await ah.auctionCount()).to.equal(1)

		await ah.connect(acc1).createAuction(10, 100, 150, 1)
		expect(await ah.auctionCount()).to.equal(2)
	})
})
