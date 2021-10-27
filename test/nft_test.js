const { expect } = require("chai")
const { ethers } = require("hardhat")

let nft
let owner, acc1, acc2
let shard

describe("NFT", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()
		let shardContract = await ethers.getContractFactory("ShardManager")
		let NFTContract = await ethers.getContractFactory("LandXNFT")
		nft = await NFTContract.deploy()
		shard = await shardContract.deploy(nft.address)
		await nft.deployed()
	})

	it("simple test...", async function () {
		expect(await nft.owner()).to.equal(owner.address)
	})

	it("minting one works", async function () {
		// uint256 _index,
		// uint256 _landArea,
		// uint256 _rent, 
		// address _shardManager,
		// address _to
		await nft.setDetailsAndMint(10, 3000000, 300, shard.address, acc1.address)
		expect(await nft.balanceOf(acc1.address, 10)).to.equal(1)
	})

	it("changing the setDetailsSetter setter works", async function () {
		expect(await nft.detailsSetter()).to.equal(owner.address)
		await nft.setDetailsSetter(acc1.address)
		expect(await nft.detailsSetter()).to.equal(acc1.address)
	})
})
