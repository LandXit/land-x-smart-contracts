const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let ah //auctionHouse
let nft, wtc, usdc
let owner, acc1, acc2

describe("Auction House 3 (auctioning)", function () {
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

	it("canceling an auction works", async function () {
		//initial balance acc1
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
		expect(await wtc.balanceOf(acc2.address)).to.equal(10000)
		expect(await nft.balanceOf(acc1.address, 11)).to.equal(0)

		//create auction ...owner
		await ah.connect(acc2).createAuction(11, 99, 100, 86400, 0)

		let auctionActive = await ah.auctionActive(0)
		expect(auctionActive).to.equal(true)

		await ah.connect(acc2).cancelAuction(0)

		auctionActive = await ah.auctionActive(0)
		expect(auctionActive).to.equal(false)
	})

	it("canceling an auction refunds the money to the highest bidder", async function () {
		//initial balance acc1
		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
		expect(await wtc.balanceOf(acc2.address)).to.equal(10000)
		expect(await nft.balanceOf(acc1.address, 11)).to.equal(0)

		//create auction ...owner
		await ah.connect(acc2).createAuction(11, 999, 1000, 86400, 0)

		//acc1 bid
		await ah.connect(acc1).bid(0, "1000")
		expect(await wtc.balanceOf(acc1.address)).to.equal(9000)

		await ah.connect(acc2).cancelAuction(0)

		expect(await wtc.balanceOf(acc1.address)).to.equal(10000)
	})

	it("only auctioneer can cancel", async function () {
		await ah.connect(acc2).createAuction(11, 100, 200, 86400, 0)
		await expect(ah.connect(acc1).cancelAuction(0)).to.be.revertedWith(
			"only the auctioneer can cancel"
		)
	})

	it("canceling an auction gives the NFT back", async function () {
		expect(await nft.balanceOf(acc2.address, 11)).to.equal(1) //in wallet
		//create auction ...owner
		await ah.connect(acc2).createAuction(11, 100, 200, 86400, 0)
		expect(await nft.balanceOf(acc2.address, 11)).to.equal(0) //in escrow
		await ah.connect(acc2).cancelAuction(0)
		expect(await nft.balanceOf(acc2.address, 11)).to.equal(1) //in wallet again
	})
})
