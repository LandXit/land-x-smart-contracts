const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { constants, BigNumber } = require("ethers");
const { ethers} = require("hardhat");
const { time, BN } = require("@openzeppelin/test-helpers");

let xToken, NFTContract, nft
let mockedUSDCContract, mockedKeyProtocolVariablesContract, mockedXTokenRouterContract, mockedRentFoundationContract
let mockedUniswapRouter, mockedLndxContract, mockedOraclePricesContract, mockedCTokenContract
let xTokenMintFee
let owner, acc1, acc2, landxOperationalWallet, xTokensSecurityWallet

describe("xToken", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, landxOperationalWallet, xTokensSecurityWallet, hedgeFundWallet, landxChoiceWallet] = await ethers.getSigners()
        const ERC20Contract = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json")
        mockedUSDCContract = await deployMockContract(owner, ERC20Contract.abi)
        mockedLndxContract = await deployMockContract(owner, ERC20Contract.abi)
        const rentFoundationContract = require("../artifacts/contracts/rentFoundation.sol/RentFoundation.json")
        mockedRentFoundationContract = await deployMockContract(owner, rentFoundationContract.abi)
        const oraclePricesContract = require("../artifacts/contracts/OraclePrices.sol/OraclePrices.json")
        mockedOraclePricesContract = await deployMockContract(owner, oraclePricesContract.abi)
        const keyProtocolVariablesContract = require("../artifacts/contracts/KeyProtocolVariables.sol/KeyProtocolVariables.json")
		mockedKeyProtocolVariablesContract = await deployMockContract(owner, keyProtocolVariablesContract.abi)
        const xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
		mockedXTokenRouterContract = await deployMockContract(owner, xTokenRouterContract.abi)
        const uniswapRouterContract = require("../node_modules/@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json")
		mockedUniswapRouter= await deployMockContract(owner, uniswapRouterContract.abi)
        const cTokenContract = require("../artifacts/contracts/cToken.sol/CToken.json")
        mockedCTokenContract = await deployMockContract(owner, cTokenContract.abi)
		
        NFTContract = await ethers.getContractFactory("LandXNFT")
		nft = await NFTContract.deploy(mockedKeyProtocolVariablesContract.address, mockedXTokenRouterContract.address)
		await nft.deployed()

        let xTokenContract = await ethers.getContractFactory("XToken")
		xToken = await xTokenContract.deploy(
			nft.address, 
			mockedLndxContract.address, 
			mockedUSDCContract.address, 
			mockedRentFoundationContract.address,
			mockedXTokenRouterContract.address, 
			mockedKeyProtocolVariablesContract.address,
            mockedUniswapRouter.address
		)
		await xToken.deployed()
        await xToken.setGrainPrices(mockedOraclePricesContract.address)
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
		await mockedKeyProtocolVariablesContract.mock.maxAllowableCropShare.withArgs("CORN").returns(1200)

        await nft.setDetailsAndMint(1, 3000000, 3000, acc1.address, "CORN", acc2.address)
        nft.connect(acc2).setApprovalForAll(xToken.address, true)
        xTokenMintFee = 300
    })
    it("Get Shards works (preLaunch mode is enabled)", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(true)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await expect(xToken.connect(acc2).getShards(1)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(92032890000)
        expect(await xToken.balanceOf(landxOperationalWallet.address)).to.equal(9603555000)
        expect(await xToken.balanceOf(xTokensSecurityWallet.address)).to.equal(6363555000)
    })

    it("Get Shards works (preLaunch mode is disabled)", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(false)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address,  Math.ceil(Date.now() / 1000) + 15, 3240000000, 1, 0]).returns(100000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address, Math.ceil(Date.now() / 1000) + 15, 6363555000, 1, 0]).returns(2000000000)
        await mockedKeyProtocolVariablesContract.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocolVariablesContract.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 300000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(mockedRentFoundationContract.address, 1700000000).returns(true)
        await mockedKeyProtocolVariablesContract.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocolVariablesContract.mock.landXOpertationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocolVariablesContract.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)
        await mockedUSDCContract.mock.transfer.withArgs(mockedLndxContract.address, 65000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 30000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 5000000).returns(true)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await expect(xToken.connect(acc2).getShards(1)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(92032890000)
        expect(await xToken.balanceOf(xTokensSecurityWallet.address)).to.equal(6363555000)
    })

    it("impossible to get Shards (not initial owner)", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(false)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address,  Math.ceil(Date.now() / 1000) + 15, 3240000000, 1, 0]).returns(100000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address, Math.ceil(Date.now() / 1000) + 15, 6363555000, 1, 0]).returns(2000000000)
        await mockedKeyProtocolVariablesContract.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocolVariablesContract.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 300000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(mockedRentFoundationContract.address, 1700000000).returns(true)
        await mockedKeyProtocolVariablesContract.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocolVariablesContract.mock.landXOpertationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocolVariablesContract.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)
        await mockedUSDCContract.mock.transfer.withArgs(mockedLndxContract.address, 65000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 30000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 5000000).returns(true)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        nft.connect(acc2).safeTransferFrom(acc2.address, acc1.address, 1, 1, 0x0)
        await expect(xToken.connect(acc1).getShards(1)).to.be.revertedWith("only initial owner can shard")
    })

    it("impossible to get Shards (nft has no land area)", async function () {
        await nft.setDetailsAndMint(2, 0, 3000, acc1.address, "CORN", acc2.address)
        await expect(xToken.connect(acc2).getShards(2)).to.be.revertedWith("this NFT has no land area set")
    })

    it("impossible to get Shards (nft has no rent)", async function () {
        await nft.setDetailsAndMint(2, 30000000, 0, acc1.address, "CORN", acc2.address)
        await expect(xToken.connect(acc2).getShards(2)).to.be.revertedWith("this NFT has no rent set")
    })

    it("impossible to get Shards (unsupported grain)", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("POTATO").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.maxAllowableCropShare.withArgs("POTATO").returns(1200)
        await nft.setDetailsAndMint(2, 30000000, 3000, acc1.address, "POTATO", acc2.address)
        await expect(xToken.connect(acc2).getShards(2)).to.be.revertedWith("wrong crop")
    })

    it("impossible to get Shards (rent already applied)", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(false)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address,  Math.ceil(Date.now() / 1000) + 15, 3240000000, 1, 0]).returns(100000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address, Math.ceil(Date.now() / 1000) + 15, 6363555000, 1, 0]).returns(2000000000)
        await mockedKeyProtocolVariablesContract.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocolVariablesContract.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 300000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(mockedRentFoundationContract.address, 1700000000).returns(true)
        await mockedKeyProtocolVariablesContract.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocolVariablesContract.mock.landXOpertationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocolVariablesContract.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)
        await mockedUSDCContract.mock.transfer.withArgs(mockedLndxContract.address, 65000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 30000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 5000000).returns(true)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(true)
        await expect(xToken.connect(acc2).getShards(1)).to.be.revertedWith("rent was already applied")
    })

    it("Get NFT back", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(true)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)

        await xToken.connect(landxOperationalWallet).transfer(acc2.address, 9603555000)
        await xToken.connect(xTokensSecurityWallet).transfer(acc2.address, 6363555000)
        await expect(xToken.connect(acc2).getTheNFT(1)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(0)
        expect(await nft.balanceOf(acc2.address, 1)).to.equal(1)
    })

    it("Can't get NFT back (not owner)", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(true)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)

        await xToken.connect(landxOperationalWallet).transfer(acc1.address, 9603555000)
        await xToken.connect(xTokensSecurityWallet).transfer(acc1.address, 6363555000)
        await xToken.connect(acc2).transfer(acc1.address, 92032890000)
        await expect(xToken.connect(acc1).getTheNFT(1)).to.be.revertedWith("only initial owner can redeem the NFT")
    })

    it("Stake works", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(true)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)
    
        await expect(xToken.connect(acc2).stake(1000000)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(92031890000)
        expect((await xToken.Staked(acc2.address))[0]).to.equal(1000000)
        expect((await xToken.TotalStaked())[0]).to.equal(1000000)
    })

    it("Additional Stake works", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(true)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)
        await expect(xToken.connect(acc2).stake(1000000)).not.to.reverted

        await time.increase(1000)
        await expect(xToken.connect(acc2).stake(1000000)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(92030890000)
        expect((await xToken.Staked(acc2.address))[0]).to.equal(2000000)
        expect((await xToken.TotalStaked())[0]).to.equal(2000000)
        expect(await xToken.totalAvailableToClaim()).to.equal(31)
    })

    it("Stake doesn't work (not enough funds)", async function () {
        await expect(xToken.connect(acc2).stake(1000000)).to.be.reverted
        expect((await xToken.Staked(acc2.address))[0]).to.equal(0)
        expect((await xToken.TotalStaked())[0]).to.equal(0)
    })

    it("Unstake works", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(true)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)
        await xToken.connect(acc2).stake(1000000)
        expect(await xToken.balanceOf(acc2.address)).to.equal(92031890000)
       
        await time.increase(1000)
        await mockedXTokenRouterContract.mock.getCToken.withArgs("CORN").returns(mockedCTokenContract.address)
        await mockedCTokenContract.mock.mint.withArgs(acc2.address, 31).returns()
        expect(await xToken.availableToClaim(acc2.address)).to.equal(31)
        await expect(xToken.connect(acc2).unstake(1000000)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(92032890000)
        expect((await xToken.Staked(acc2.address))[0]).to.equal(0)
        expect((await xToken.TotalStaked())[0]).to.equal(0)
        expect(await xToken.Claimed(acc2.address)).to.equal(31)
    })

    it("set RentFoundation contract", async function () {
        let rentFoundationContract = require("../artifacts/contracts/rentFoundation.sol/RentFoundation.json")
        let mockedRentFoundationContract2 = await deployMockContract(owner, rentFoundationContract.abi)
        await xToken.setRentFoundation(mockedRentFoundationContract2.address)
        expect(await xToken.rentFoundation()).to.equal(mockedRentFoundationContract2.address)
	})

    it("it is not possible to set RentFoundation contract (not owner contract)", async function () {
        let rentFoundationContract = require("../artifacts/contracts/rentFoundation.sol/RentFoundation.json")
        let mockedRentFoundationContract2 = await deployMockContract(owner, rentFoundationContract.abi)
        await expect(xToken.connect(acc1).setRentFoundation(mockedRentFoundationContract2.address)).to.be.reverted
	})

    it("get decimals  works", async function () {
        expect(await xToken.decimals()).to.equal(6)
	})

    it("set XTokenRouter", async function () {
        let xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
        let mockedXTokenRouterContract2 = await deployMockContract(owner, xTokenRouterContract.abi)
        await xToken.setXTokenRouter(mockedXTokenRouterContract2.address)
        expect(await xToken.xTokenRouter()).to.equal(mockedXTokenRouterContract2.address)
	})

    it("impossible to set XTokenRouter", async function () {
        let xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
        let mockedXTokenRouterContract2 = await deployMockContract(owner, xTokenRouterContract.abi)
        await expect(xToken.connect(acc1).setXTokenRouter(mockedXTokenRouterContract2.address)).to.be.reverted
	})

    it("set XBasketAddress", async function () {
        let xBasketContract = require("../artifacts/contracts/xBasket.sol/xBasket.json")
        let mockedXBascetContract= await deployMockContract(owner, xBasketContract.abi)
        await xToken.changeXBasketAddress(mockedXBascetContract.address)
        expect(await xToken.xBasketContract()).to.equal(mockedXBascetContract.address)
	})

    it("impossible to set XBasketAddress", async function () {
        let xBasketContract = require("../artifacts/contracts/xBasket.sol/xBasket.json")
        let mockedXBasketContract= await deployMockContract(owner, xBasketContract.abi)
        await expect(xToken.connect(acc1).changeXBasketAddress(mockedXBasketContract.address)).to.be.reverted
	})

    it("set NFT Contract", async function () {
        let nft= require("../artifacts/contracts/nft.sol/LandXNFT.json")
        let mockedNFTContract= await deployMockContract(owner, nft.abi)
        await xToken.changeLandXNFTAddress(mockedNFTContract.address)
        expect(await xToken.landXNFT()).to.equal(mockedNFTContract.address)
	})

    it("impossible set NFT Contract", async function () {
        let nft= require("../artifacts/contracts/nft.sol/LandXNFT.json")
        let mockedNFTContract= await deployMockContract(owner, nft.abi)
        await expect(xToken.connect(acc1).changeLandXNFTAddress(mockedNFTContract.address)).to.be.reverted
	})

    it("preview", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        expect((await xToken.preview(1))[0]).to.equal(108000000000)
        expect((await xToken.preview(1))[1]).to.equal(3240000000)
        expect((await xToken.preview(1))[2]).to.equal(12727110000)
        expect((await xToken.preview(1))[3]).to.equal(92032890000)
    })

    it("preview", async function () {
        await nft.setDetailsAndMint(2, 0, 3000, acc1.address, "CORN", acc2.address)
        await expect(xToken.preview(2)).to.be.revertedWith("this NFT has no land area set")
    })

    it("preview", async function () {
        await nft.setDetailsAndMint(2, 30000000, 0, acc1.address, "CORN", acc2.address)
        await expect(xToken.preview(2)).to.be.revertedWith("this NFT has no rent set")
    })

    it("XBasket Transfer", async function () {
        await xToken.changeXBasketAddress(acc1.address)
        
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(true)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)
        
        await expect(xToken.connect(acc1).xBasketTransfer(acc2.address, 1000000)).not.to.reverted
        expect(await xToken.balanceOf(acc1.address)).to.equal(1000000)
	})

    it("XBasket Transfer not allowed", async function () {
        await xToken.changeXBasketAddress(acc1.address)
        
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        await mockedKeyProtocolVariablesContract.mock.preLaunch.withArgs().returns(true)
        await mockedKeyProtocolVariablesContract.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocolVariablesContract.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 108000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)
        
        await expect(xToken.connect(owner).xBasketTransfer(acc2.address, 1000000)).to.be.reverted
	})
})