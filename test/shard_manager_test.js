const { expect, assert } = require("chai")
const { web3, ethers } = require("hardhat")
const { BN, time, balance, expectEvent, expectRevert } = require("@openzeppelin/test-helpers")
const ether = require("@openzeppelin/test-helpers/src/ether")

let shardManager, theNFT
let owner, acc1, acc2

describe("Shard Manager", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()

		let NFTContract = await ethers.getContractFactory("LandXNFT")
		theNFT = await NFTContract.deploy()
		await theNFT.deployed()

		let ShardManagerContract = await ethers.getContractFactory("ShardManager")
		shardManager = await ShardManagerContract.deploy(theNFT.address)
		await shardManager.deployed()
	})

	it("simple test...", async function () {
		expect(await shardManager.totalSupply()).to.equal(0)
	})

	it("shards would be gone when you get your NFT back", async function () {
		await theNFT.setDetailsAndMint(10, 3000000, 300, acc1.address)
		expect(await theNFT.balanceOf(acc1.address, 10)).to.equal(1)
		await theNFT.connect(acc1).setApprovalForAll(shardManager.address, true)
		expect(await shardManager.connect(acc1).getShards(10))
		expect(await shardManager.balanceOf(acc1.address)).to.equal(web3.utils.toWei("90000", "ether"))
		expect(await shardManager.totalSupply()).to.equal(web3.utils.toWei("90000", "ether"))

		expect(await theNFT.balanceOf(acc1.address, 10)).to.equal(0)
		//set allowance
		await shardManager
			.connect(acc1)
			.approve(shardManager.address, web3.utils.toWei("99999999999", "ether"))

		//now deposit the shards back to get the NFT
		await shardManager.connect(acc1).getTheNFT(10)
		expect(await theNFT.balanceOf(acc1.address, 10)).to.equal(1)

		expect(await shardManager.balanceOf(acc1.address)).to.equal(0)
		expect(await shardManager.totalSupply()).to.equal(0)
	})

	it("you should get NFT when you deposit the shards back", async function () {
		await theNFT.setDetailsAndMint(10, 3000000, 300, acc1.address)
		expect(await theNFT.balanceOf(acc1.address, 10)).to.equal(1)
		await theNFT.connect(acc1).setApprovalForAll(shardManager.address, true)
		expect(await shardManager.connect(acc1).getShards(10))
		expect(await shardManager.balanceOf(acc1.address)).to.equal(web3.utils.toWei("90000", "ether"))

		expect(await theNFT.balanceOf(acc1.address, 10)).to.equal(0)

		//set allowance
		await shardManager
			.connect(acc1)
			.approve(shardManager.address, web3.utils.toWei("90000", "ether"))

		//now deposit the shards back to get the NFT
		await shardManager.connect(acc1).getTheNFT(10)

		expect(await theNFT.balanceOf(acc1.address, 10)).to.equal(1)
	})

	it("you should get correct shards when you transfer an NFT", async function () {
		// uint256 _index,
		// uint256 _landArea,
		// uint256 _rent,
		// address _to
		await theNFT.setDetailsAndMint(10, 3000000, 300, acc1.address)
		expect(await theNFT.balanceOf(acc1.address, 10)).to.equal(1)
		await theNFT.connect(acc1).setApprovalForAll(shardManager.address, true)
		expect(await shardManager.connect(acc1).getShards(10))
		expect(await shardManager.balanceOf(acc1.address)).to.equal(web3.utils.toWei("90000", "ether"))
	})

	it("you must approve the NFT before getting the shards", async function () {
		await theNFT.setDetailsAndMint(10, 3000000, 300, acc1.address)
		expect(await theNFT.balanceOf(acc1.address, 10)).to.equal(1)
		await expect(shardManager.connect(acc1).getShards(10)).to.be.revertedWith(
			"caller is not owner nor approved"
		)
	})

	it("you must own this NFT", async function () {
		await expect(shardManager.connect(acc1).getShards(1)).to.be.revertedWith(
			"you must own this NFT"
		)
	})
})
