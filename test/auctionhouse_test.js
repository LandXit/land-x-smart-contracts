const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants")

let ah //auctionHouse
let nft, wtc, usdc
let owner, acc1, acc2

describe("Auction House", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		let NFTContract = await ethers.getContractFactory("LandXNFT")
		nft = await NFTContract.deploy()
		await nft.deployed()

		let shardContract = await ethers.getContractFactory("ShardManager")
		shard = await shardContract.deploy(nft.address)

		let ERC20MockContract = await ethers.getContractFactory("ERC20Mock")
		wtc = await ERC20MockContract.deploy("WTCMock", "WTC", "100000")
		await wtc.deployed()

		let AuctionHouseContract = await ethers.getContractFactory("AuctionHouse")
		//address _landxNFT, address _wtc, address _usdc
		ah = await AuctionHouseContract.deploy(nft.address, wtc.address)
		await ah.deployed()

		//mint some NFT Tokens
		//uint256 _index, uint256 _landArea, uint256 _rent, address _to
		await nft.setDetailsAndMint(9, 3000000, 300, shard.address, owner.address)
		await nft.setDetailsAndMint(10, 3000000, 300, shard.address, acc1.address)
		await nft.setDetailsAndMint(11, 3000000, 300, shard.address, acc2.address)

		//setApprovalForAll
		await nft.connect(owner).setApprovalForAll(ah.address, true)
		await nft.connect(acc1).setApprovalForAll(ah.address, true)
		await nft.connect(acc2).setApprovalForAll(ah.address, true)

		//transfer some currencies
		await wtc.transfer(acc1.address, "10000")
		await wtc.transfer(acc2.address, "10000")

		//set allowance for the AuctionHouse
		await wtc.connect(owner).increaseAllowance(ah.address, 99999999999999)
		await wtc.connect(acc1).increaseAllowance(ah.address, 99999999999999)
		await wtc.connect(acc2).increaseAllowance(ah.address, 99999999999999)
	})

	it("simple test...", async function () {
		expect(await ah.sellsCount()).to.equal(0)
	})

	it("as an owner you can withdraw comission", async function () {
		let initialBalancewtc = await wtc.balanceOf(owner.address)
		await ah.connect(acc1).putForSale(0, 10, 2000, 60, ZERO_ADDRESS)
		await ah.connect(acc2).buyItem(0)
		//03% of 2000 = 60
		expect(Number(await wtc.balanceOf(ah.address))).to.equal(60)
		await ah.connect(owner).reclaimERC20(wtc.address)
		let finalBalancewtc = await wtc.balanceOf(owner.address)
		expect(finalBalancewtc - initialBalancewtc).to.equal(60)
	})

	it("(wtc) - buying an item will give the seller his cut and the ah its cut", async function () {
		expect(Number(await wtc.balanceOf(acc1.address))).to.equal(10000)
		expect(Number(await wtc.balanceOf(acc2.address))).to.equal(10000)

		await ah.connect(acc1).putForSale(0, 10, 2000, 60, ZERO_ADDRESS)
		await ah.connect(acc2).buyItem(0)
		//3% of 2000 = 60
		expect(Number(await wtc.balanceOf(acc2.address))).to.equal(8000)
		expect(Number(await wtc.balanceOf(ah.address))).to.equal(60)
		expect(Number(await wtc.balanceOf(acc1.address))).to.equal(11940) //-60 tokens fee
	})

	it("you can buy an item (simple)", async function () {
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
		expect(await nft.balanceOf(acc2.address, 10)).to.equal(0)
		await ah.connect(acc1).putForSale(0, 10, 100, 60, ZERO_ADDRESS)
		await ah.connect(acc2).buyItem(0)
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(0)
		expect(await nft.balanceOf(acc2.address, 10)).to.equal(1)
	})

	it("withdrawing an unsold item", async function () {
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
		//	function putForSale(uint256 nftID,uint256 price,uint256 saleDurationInSeconds)
		await ah.connect(acc1).putForSale(0, 10, 100, 60, ZERO_ADDRESS)
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(0)

		await ah.connect(acc1).removeFromSale(0)
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
	})

	it("only the seller can remove an unsold item", async function () {
		await ah.connect(acc1).putForSale(0, 10, 100, 60, ZERO_ADDRESS)
		await expect(ah.connect(acc2).removeFromSale(0)).to.be.revertedWith(
			"only the seller can remove it"
		)
	})

	it("you can't put for sale an un-owned nft", async function () {
		await expect(ah.connect(acc1).putForSale(0, 99, 100, 60, ZERO_ADDRESS)).to.be.revertedWith(
			"ERC1155: insufficient balance for transfer"
		)
	})

	it("you can't withdraw a sold item", async function () {
		await ah.connect(acc1).putForSale(0, 10, 100, 60, ZERO_ADDRESS)
		await ah.connect(acc2).buyItem(0)
		await expect(ah.connect(acc2).removeFromSale(0)).to.be.revertedWith("can't claim a sold item")
	})

	it("you can buy an item (private listing)", async function () {
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
		expect(await nft.balanceOf(acc2.address, 10)).to.equal(0)
		await ah.connect(acc1).putForSale(0, 10, 100, 60, acc2.address)
		await ah.connect(acc2).buyItem(0)
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(0)
		expect(await nft.balanceOf(acc2.address, 10)).to.equal(1)
	})

	it("you can't buy an item (private listing)", async function () {
		await ah.connect(acc1).putForSale(0, 10, 100, 60, acc3.address)
		await expect(ah.connect(acc2).buyItem(0)).to.be.revertedWith("this listing is private")
	})
})

// // time passes
// await time.increase(20)
// const startingBlock = await time.latestBlock()
// const endBlock = startingBlock.addn(1)
// await time.advanceBlockTo(endBlock)
