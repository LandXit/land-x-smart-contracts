const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants } = require("ethers");
const { ethers } = require("hardhat")

let nft
let owner, acc1, acc2, acc3
let xTokenContractAddress = "0xa357bBa06c199f85E742A7F22972e212E65f1550"
let mockedKeyProtocolVariablesContract, mockedXTokenRouterContract

describe("NFT", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3] = await ethers.getSigners()
		const KeyProtocolVariablesContract = require("../artifacts/contracts/KeyProtocolVariables.sol/KeyProtocolVariables.json")
		mockedKeyProtocolVariablesContract = await deployMockContract(owner, KeyProtocolVariablesContract.abi)
		const xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
		mockedXTokenRouterContract = await deployMockContract(owner, xTokenRouterContract.abi)
		let NFTContract = await ethers.getContractFactory("LandXNFT")
		nft = await NFTContract.deploy(mockedKeyProtocolVariablesContract.address, mockedXTokenRouterContract.address)
		await nft.deployed()
	})

	it("simple test...", async function () {
		expect(await nft.owner()).to.equal(owner.address)
	})

	it("minting  works", async function () {
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocolVariablesContract.mock.maxAllowableCropShare.withArgs("SOY").returns(1200)
		// uint256 _index,
		// uint256 _landArea,
		// uint256 _yield, 
		// address _validator,
		// string _crop,
		// address _to
		await nft.setDetailsAndMint(1, 3000000, 3000, acc1.address, "SOY", acc2.address)
		expect(await nft.balanceOf(acc2.address, 1)).to.equal(1)
	})

	it("minting  doesn't work because token exists", async function () {
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocolVariablesContract.mock.maxAllowableCropShare.withArgs("SOY").returns(1200)
		await nft.setDetailsAndMint(1, 3000000, 3000, acc1.address, "SOY", acc2.address)
		expect(nft.setDetailsAndMint(1, 3000000, 3000, acc1.address, "SOY", acc2.address)).to.be.revertedWith("tokenID already minted")
	})

	it("minting  doesn't work because xToken is not exists(not set)", async function () {
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(constants.AddressZero)
		expect(nft.setDetailsAndMint(1, 3000000, 3000, acc1.address, "SOY", acc2.address)).to.be.revertedWith("xToken is not defined")
	})

	it ("burning NFT works for NFT owner", async function (){
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocolVariablesContract.mock.maxAllowableCropShare.withArgs("SOY").returns(1200)
		await nft.setDetailsAndMint(1, 3000000, 3000, acc1.address, "SOY", acc2.address)

		await nft.connect(acc2).burn(acc2.address, 1, 1)
		expect(await nft.balanceOf(acc2.address, 1)).to.equal(0)
	})

	it ("burning NFT works for not owner when it approved", async function (){
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocolVariablesContract.mock.maxAllowableCropShare.withArgs("SOY").returns(1200)
		await nft.setDetailsAndMint(1, 3000000, 3000, acc1.address, "SOY", acc2.address)
		await nft.connect(acc2).setApprovalForAll(acc3.address, true)
		
		await nft.connect(acc3).burn(acc2.address, 1, 1)
		expect(await nft.balanceOf(acc2.address, 1)).to.equal(0)
	})

	it ("burning NFT doesn't work for not owner", async function (){
		await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress)
		await mockedKeyProtocolVariablesContract.mock.maxAllowableCropShare.withArgs("SOY").returns(1200)
		await nft.setDetailsAndMint(1, 3000000, 3000, acc1.address, "SOY", acc2.address)
		
		expect(nft.connect(acc3).burn(acc2.address, 1, 1)).to.be.revertedWith("ERC1155: caller is not owner nor approved")
	})

	it ("set base token URI works", async function (){
		await expect(nft.setBaseURI("some_url")).not.to.reverted
	})

	it ("set base token URI doesn't work", async function (){
		await expect(nft.connect(acc1).setBaseURI("some_url")).to.be.reverted
	})

	it ("set contract URI works", async function (){
		await expect(nft.setContractURI("some_url")).not.to.reverted
	})

	it ("set contract URI doesn't work", async function (){
		await expect(nft.connect(acc1).setContractURI("some_url")).to.be.reverted
	})

	it ("set xTokenRouter works", async function (){
		await expect(nft.setXTokenRouter("0x4ab1dEA2F94ECf2a25B8B81D29da05443fe4A420")).not.to.reverted
	})

	it ("set xTokenRouter doesn't work", async function (){
		await expect(nft.connect(acc1).setXTokenRouter("0x4ab1dEA2F94ECf2a25B8B81D29da05443fe4A420")).to.be.reverted
	})

	it ("get contract URI works", async function (){
		await nft.setContractURI("some_url")
		expect(await nft.contractURI()).to.equal("some_url")
	})

	it ("get uri", async function (){
		await nft.setBaseURI("some_url/")
		expect(await nft.uri(1)).to.equal("some_url/1")
		expect(await nft.uri(0)).to.equal("some_url/0")
	})

	it ("get uri doesn't work", async function (){
		await nft.setBaseURI("some_url/")
		await expect(nft.uri("35h")).to.be.reverted
	})

})