const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let ah //auctionHouse
let nft, lndx, usdc
let owner, acc1, acc2

describe("Auction House", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		let NFTContract = await ethers.getContractFactory("LandXNFT")
		nft = await NFTContract.deploy()
		await nft.deployed()

		let ERC20MockContract = await ethers.getContractFactory("ERC20Mock")
		lndx = await ERC20MockContract.deploy("LNDXMock", "LNDX", "100000")
		await lndx.deployed()

		usdc = await ERC20MockContract.deploy("USDCMock", "USDC", "100000")
		await usdc.deployed()

		let AuctionHouseContract = await ethers.getContractFactory("AuctionHouse")
		//address _landxNFT, address _lndx, address _usdc
		ah = await AuctionHouseContract.deploy(nft.address, lndx.address, usdc.address)
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
		await lndx.transfer(acc1.address, "10000")
		await lndx.transfer(acc2.address, "10000")
		await usdc.transfer(acc1.address, "10000")
		await usdc.transfer(acc2.address, "10000")

		//set allowance for the AuctionHouse
		await lndx.connect(owner).increaseAllowance(ah.address, 99999999999999)
		await lndx.connect(acc1).increaseAllowance(ah.address, 99999999999999)
		await lndx.connect(acc2).increaseAllowance(ah.address, 99999999999999)

		await usdc.connect(owner).increaseAllowance(ah.address, 99999999999999)
		await usdc.connect(acc1).increaseAllowance(ah.address, 99999999999999)
		await usdc.connect(acc2).increaseAllowance(ah.address, 99999999999999)
	})

	it("simple test...", async function () {
		expect(await ah.sellsCount()).to.equal(0)
	})

	it("as an owner you can withdraw comission", async function () {
		let initialBalanceLNDX = await lndx.balanceOf(owner.address)
		await ah.connect(acc1).putForSale(0, 10, 2000, 60)
		await ah.connect(acc2).buyItem(0)
		//0.5% of 2000 = 10
		expect(Number(await lndx.balanceOf(ah.address))).to.equal(10)
		await ah.connect(owner).reclaimERC20(lndx.address)
		let finalBalanceLNDX = await lndx.balanceOf(owner.address)
		expect(finalBalanceLNDX - initialBalanceLNDX).to.equal(10)
	})

	it("(LNDX) - buying an item will give the seller his cut and the ah its cut", async function () {
		expect(Number(await lndx.balanceOf(acc1.address))).to.equal(10000)
		expect(Number(await lndx.balanceOf(acc2.address))).to.equal(10000)

		await ah.connect(acc1).putForSale(0, 10, 2000, 60)
		await ah.connect(acc2).buyItem(0)
		//0.5% of 2000 = 10
		expect(Number(await lndx.balanceOf(acc2.address))).to.equal(8000)
		expect(Number(await lndx.balanceOf(ah.address))).to.equal(10)
		expect(Number(await lndx.balanceOf(acc1.address))).to.equal(11990) //-10 tokens fee
	})

	it("(USDC) - buying an item will give the seller his cut and the ah its cut", async function () {
		expect(Number(await usdc.balanceOf(acc1.address))).to.equal(10000)
		expect(Number(await usdc.balanceOf(acc2.address))).to.equal(10000)

		await ah.connect(acc1).putForSale(1, 10, 300, 60)
		await ah.connect(acc2).buyItem(0)
		//3% of 300 = 9
		expect(Number(await usdc.balanceOf(acc2.address))).to.equal(9700)
		expect(Number(await usdc.balanceOf(ah.address))).to.equal(9)
		expect(Number(await usdc.balanceOf(acc1.address))).to.equal(10291) //-9 tokens fee
	})

	it("you can buy an item (simple)", async function () {
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
		expect(await nft.balanceOf(acc2.address, 10)).to.equal(0)
		await ah.connect(acc1).putForSale(0, 10, 100, 60)
		await ah.connect(acc2).buyItem(0)
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(0)
		expect(await nft.balanceOf(acc2.address, 10)).to.equal(1)
	})

	it("withdrawing an unsold item", async function () {
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
		//	function putForSale(uint256 currency,uint256 nftID,uint256 price,uint256 saleDurationInSeconds)
		await ah.connect(acc1).putForSale(0, 10, 100, 60)
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(0)

		await ah.connect(acc1).removeFromSale(0)
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
	})

	it("only the seller can remove an unsold item", async function () {
		await ah.connect(acc1).putForSale(0, 10, 100, 60)
		await expect(ah.connect(acc2).removeFromSale(0)).to.be.revertedWith(
			"only the seller can remove it"
		)
	})

	it("you can't put for sale an un-owned nft", async function () {
		await expect(ah.connect(acc1).putForSale(0, 99, 100, 60)).to.be.revertedWith(
			"ERC1155: insufficient balance for transfer"
		)
	})

	it("you can't withdraw a sold item", async function () {
		await ah.connect(acc1).putForSale(0, 10, 100, 60)
		await ah.connect(acc2).buyItem(0)
		await expect(ah.connect(acc2).removeFromSale(0)).to.be.revertedWith("can't claim a sold item")
	})
})

// // time passes
// await time.increase(20)
// const startingBlock = await time.latestBlock()
// const endBlock = startingBlock.addn(1)
// await time.advanceBlockTo(endBlock)
