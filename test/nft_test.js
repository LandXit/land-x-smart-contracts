const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants } = require("ethers");
const { ethers } = require("hardhat")

let nft
let owner, acc1, acc2, acc3
let xTokenContractAddress = "0xa357bBa06c199f85E742A7F22972e212E65f1550"
let mockedXTokenRouterContract

describe("NFT", function () {
	beforeEach(async function () {
		console.log("", '\n')
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()
		const xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
		mockedXTokenRouterContract = await deployMockContract(owner, xTokenRouterContract.abi)
		const keyProtocolVariablesContract = require("../artifacts/contracts/KeyProtocolVariables.sol/KeyProtocolVariables.json")
		mockedKeyProtocalValues= await deployMockContract(owner, keyProtocolVariablesContract.abi)
		let NFTContract = await ethers.getContractFactory("LandXNFT")
		nft = await NFTContract.deploy(mockedXTokenRouterContract.address, mockedKeyProtocalValues.address, "http://dev-landx-nfts.s3-website-us-east-1.amazonaws.com/j/")
		await nft.deployed()
	})

	it("minting  works", async function () {
		console.log("Minting nft for " + acc1.address + " with parameters")
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocalValues.mock.maxValidatorFee.withArgs().returns(10000)
		await nft.setDetailsAndMint(1, 3000000, 3000000, 3000, acc1.address, 1000, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824","SOY", acc2.address, "")
		expect(await nft.balanceOf(acc2.address, 1)).to.equal(1)
	})

	it("minting  doesn't work because token exists", async function () {
		console.log("try to mint NFT with id=1, but token with ID=1 already exists")
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocalValues.mock.maxValidatorFee.withArgs().returns(10000)
		await nft.setDetailsAndMint(1, 3000000, 3000000, 3000, acc1.address, 1000, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824","SOY", acc2.address, "")
		expect(nft.setDetailsAndMint(1, 3000000, 3000000, 3000, acc1.address, 1000, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824","SOY", acc2.address, "")).to.be.revertedWith("tokenID already minted")
	})

	it("minting  doesn't work because two high validator's fee", async function () {
		console.log("try to mint NFT with id=1, but token with ID=1 already exists")
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocalValues.mock.maxValidatorFee.withArgs().returns(10000)
		expect(nft.setDetailsAndMint(1, 3000000, 3000000, 3000, acc1.address, 10001,"0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824","SOY", acc2.address, "")).to.be.revertedWith("validator's fee to high")
	})

	it("minting  doesn't work because xToken is not exists(not set)", async function () {
		console.log("try to mint NFT but there is no xToken contract for provided crop type")
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(constants.AddressZero)
		await mockedKeyProtocalValues.mock.maxValidatorFee.withArgs().returns(10000)
		expect(nft.setDetailsAndMint(1, 3000000, 3000000, 3000, acc1.address, 1000, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824","SOY", acc2.address, "")).to.be.revertedWith("xToken is not defined")
	})

	it ("burning NFT works for NFT owner", async function (){
		console.log("NFT owner burns his NFT")
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocalValues.mock.maxValidatorFee.withArgs().returns(10000)
		await nft.setDetailsAndMint(1, 3000000, 3000000, 3000, acc1.address, 1000, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824","SOY", acc2.address, "")

		await nft.connect(acc2).burn(acc2.address, 1, 1)
		expect(await nft.balanceOf(acc2.address, 1)).to.equal(0)
	})

	it ("burning NFT works for not owner when it approved", async function (){
		console.log("not NFT owner burns the NFT of other owner if he has allowance")
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocalValues.mock.maxValidatorFee.withArgs().returns(10000)
		await nft.setDetailsAndMint(1, 3000000, 3000000, 3000, acc1.address, 1000, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824","SOY", acc2.address, "")
		await nft.connect(acc2).setApprovalForAll(acc3.address, true)
		
		await nft.connect(acc3).burn(acc2.address, 1, 1)
		expect(await nft.balanceOf(acc2.address, 1)).to.equal(0)
	})

	it ("burning NFT doesn't work for not owner", async function (){
		console.log("not NFT owner try to burn the NFT, transaction should be reverted")
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocalValues.mock.maxValidatorFee.withArgs().returns(10000)
		await nft.setDetailsAndMint(1, 3000000, 3000000, 3000, acc1.address, 1000, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824","SOY", acc2.address, "")
		
		expect(nft.connect(acc3).burn(acc2.address, 1, 1)).to.be.revertedWith("ERC1155: caller is not owner nor approved")
	})

	it ("set base token URI works", async function (){
		console.log("set token URI by contract owner")
		await expect(nft.setBaseURI("some_url")).not.to.reverted
	})

	it ("set base token URI doesn't work", async function (){
		console.log("set token URI by not contract owner, transaction should be reverted")
		await expect(nft.connect(acc1).setBaseURI("some_url")).to.be.reverted
	})

	it ("set base token URI doesn't work, empty string", async function (){
		await expect(nft.setBaseURI("")).to.be.revertedWith("empty string")
	})

	it ("set xTokenRouter works", async function (){
		console.log("updates xTokenRouter contract by contract owner")
		await expect(nft.setXTokenRouter("0x4ab1dEA2F94ECf2a25B8B81D29da05443fe4A420")).not.to.reverted
	})

	it ("set xTokenRouter doesn't work", async function (){
		console.log("try to update xTokenRouter contract by NOT contract owner")
		await expect(nft.connect(acc1).setXTokenRouter("0x4ab1dEA2F94ECf2a25B8B81D29da05443fe4A420")).to.be.reverted
	})

	it ("set xTokenRouter doesn't work, zero address is not allowed", async function (){
		await expect(nft.connect(owner).setXTokenRouter(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

	it ("get uri", async function (){
		console.log("returns uri for NFT token by token ID")
		await nft.setBaseURI("some_url/")
		expect(await nft.uri(1)).to.equal("some_url/")
		expect(await nft.uri(0)).to.equal("some_url/")
	})

	it ("get uri doesn't work", async function (){
		console.log("try to get uri for NFT token by token ID that has no valid type(35h), should be reverted")
		await nft.setBaseURI("some_url/")
		await expect(nft.uri("35h")).to.be.reverted
	})

})