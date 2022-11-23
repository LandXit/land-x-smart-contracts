const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { constants, BigNumber } = require("ethers");
const { ethers} = require("hardhat");
const { time, BN } = require("@openzeppelin/test-helpers");
const { zeroAddress } = require("ethereumjs-util");

let xToken, NFTContract, nft
let mockedUSDCContract, mockedKeyProtocolVariablesContract, mockedXTokenRouterContract, mockedRentFoundationContract
let mockedUniswapRouter, mockedLndxContract, mockedOraclePricesContract, mockedCTokenContract
let xTokenMintFee
let owner, acc1, acc2, acc3, landxOperationalWallet, xTokensSecurityWallet, xSOY

describe("xToken", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3, landxOperationalWallet, xTokensSecurityWallet, hedgeFundWallet, landxChoiceWallet, xSOY] = await ethers.getSigners()
        const ERC20Contract = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json")
        mockedUSDCContract = await deployMockContract(owner, ERC20Contract.abi)
        const LNDXContract = require("../artifacts/contracts/LNDX.sol/LNDX.json")
        mockedLndxContract = await deployMockContract(owner, LNDXContract.abi)
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
		nft = await NFTContract.deploy(mockedXTokenRouterContract.address, "http://dev-landx-nfts.s3-website-us-east-1.amazonaws.com/j/")
		await nft.deployed()

        let xTokenContract = await ethers.getContractFactory("XToken")
		xToken = await xTokenContract.deploy(
			nft.address, 
			mockedLndxContract.address, 
			mockedUSDCContract.address, 
			mockedRentFoundationContract.address,
			mockedXTokenRouterContract.address, 
			mockedKeyProtocolVariablesContract.address,
            mockedUniswapRouter.address,
            mockedOraclePricesContract.address,
            "CORN"
		)
		await xToken.deployed()
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)

        await nft.setDetailsAndMint(1, 3000000, 3000000, 3000, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "CORN", acc2.address)
        nft.connect(acc2).setApprovalForAll(xToken.address, true)
        xTokenMintFee = 300
    })

    it("check symbol value", async function () {
        expect(await xToken.symbol()).to.equal("xCORN")
	})

    it("owner can't renounceOwnership", async function () {
        await expect(xToken.connect(owner).renounceOwnership()).to.be.revertedWith("can 't renounceOwnership here")
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await expect(xToken.connect(acc2).getShards(1)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(766940742000)
        expect(await xToken.balanceOf(landxOperationalWallet.address)).to.equal(80029629000)
        expect(await xToken.balanceOf(xTokensSecurityWallet.address)).to.equal(53029629000)
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
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address, 32336000 + 100000 + Math.ceil(Date.now() / 1000) + 15, 27000000000, 1, 0]).returns(100000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address, 32336000 + 100000 + Math.ceil(Date.now() / 1000) + 15, 53029629000, 1, 0]).returns(2000000000)
        await mockedKeyProtocolVariablesContract.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocolVariablesContract.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 300000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(mockedRentFoundationContract.address, 1700000000).returns(true)
        await mockedKeyProtocolVariablesContract.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocolVariablesContract.mock.landXOpertationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocolVariablesContract.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)
        await mockedUSDCContract.mock.transfer.withArgs(mockedLndxContract.address, 65000000).returns(true)
        await mockedLndxContract.mock.feeToDistribute.withArgs(65000000).returns();
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 30000000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 5000000).returns(true)
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await expect(xToken.connect(acc2).getShards(1)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(766940742000)
        expect(await xToken.balanceOf(xTokensSecurityWallet.address)).to.equal(53029629000)
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
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address,  32336000 + 100000 + Math.ceil(Date.now() / 1000) + 15, 3240000000, 1, 0]).returns(100000000)
        await mockedUniswapRouter.mock.exactInputSingle.withArgs([xToken.address, mockedUSDCContract.address, 3000, xToken.address, 32336000 + 100000 + Math.ceil(Date.now() / 1000) + 15, 6363555000, 1, 0]).returns(2000000000)
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        nft.connect(acc2).safeTransferFrom(acc2.address, acc1.address, 1, 1, 0x0)
        await expect(xToken.connect(acc1).getShards(1)).to.be.revertedWith("only initial owner can shard")
    })

    it("impossible to get Shards (nft has no land area)", async function () {
        await nft.setDetailsAndMint(2, 0, 0, 3000, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "CORN", acc2.address)
        await expect(xToken.connect(acc2).getShards(2)).to.be.revertedWith("this NFT has no land area set")
    })

    it("impossible to get Shards (nft has no rent)", async function () {
        await nft.setDetailsAndMint(2, 30000000, 30000000, 0, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "CORN", acc2.address)
        await expect(xToken.connect(acc2).getShards(2)).to.be.revertedWith("this NFT has no crop share set")
    })

    it("impossible to get Shards (unsupported grain)", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("POTATO").returns(xToken.address)
        await nft.setDetailsAndMint(2, 30000000, 30000000, 3000, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "POTATO", acc2.address)
        await expect(xToken.connect(acc2).getShards(2)).to.be.revertedWith("wrong crop")
    })

    it("impossible to get Shards (wrong xToken contract)", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xSOY.address)
        await nft.setDetailsAndMint(2, 30000000, 30000000, 3000, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "CORN", acc2.address)
        await expect(xToken.connect(acc2).getShards(2)).to.be.revertedWith("tokens are not set for this crop")
    })

    it("impossible to get Shards (not token owner)", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await nft.setDetailsAndMint(2, 30000000, 30000000, 3000, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "CORN", acc2.address)
        await nft.connect(acc2).safeTransferFrom(acc2.address, acc3.address, 2, 1, 0x0)
        await expect(xToken.connect(acc2).getShards(2)).to.be.revertedWith("you must own this NFT")
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)

        await xToken.connect(landxOperationalWallet).transfer(acc2.address, 80029629000)
        await xToken.connect(xTokensSecurityWallet).transfer(acc2.address, 53029629000)
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)
    
        await expect(xToken.connect(acc2).stake(1000000)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(766939742000)
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)
        await expect(xToken.connect(acc2).stake(1000000)).not.to.reverted

        await time.increase(1000)
        await expect(xToken.connect(acc2).stake(1000000)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(766938742000)
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)
        await xToken.connect(acc2).stake(1000000)
        expect(await xToken.balanceOf(acc2.address)).to.equal(766939742000)
       
        await time.increase(1000)
        await mockedXTokenRouterContract.mock.getCToken.withArgs("CORN").returns(mockedCTokenContract.address)
        await mockedCTokenContract.mock.mint.withArgs(acc2.address, 31).returns()
        expect(await xToken.availableToClaim(acc2.address)).to.equal(31)
        await expect(xToken.connect(acc2).unstake(1000000)).not.to.reverted
        expect(await xToken.balanceOf(acc2.address)).to.equal(766940742000)
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

    it("impossible to set RentFoundation, zero address", async function () {
        await expect(xToken.setRentFoundation(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

    it("set OraclePrices contract", async function () {
        const oraclePricesContract = require("../artifacts/contracts/OraclePrices.sol/OraclePrices.json")
        let mockedOraclePricesContract2 = await deployMockContract(owner, oraclePricesContract.abi)
        await xToken.setOraclePrices(mockedOraclePricesContract2.address)
        expect(await xToken.oraclePrices()).to.equal(mockedOraclePricesContract2.address)
	})


    it("it is not possible to set OraclePrices contract (not owner contract)", async function () {
        const oraclePricesContract = require("../artifacts/contracts/OraclePrices.sol/OraclePrices.json")
        let mockedOraclePricesContract2 = await deployMockContract(owner, oraclePricesContract.abi)
        await expect(xToken.connect(acc1).setOraclePrices(mockedOraclePricesContract2.address)).to.be.reverted
	})

    it("impossible to set OraclePrices, zero address", async function () {
        await expect(xToken.setOraclePrices(zeroAddress())).to.be.revertedWith("zero address is not allowed")
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

    it("impossible to set XTokenRouter, zero address", async function () {
        await expect(xToken.setXTokenRouter(zeroAddress())).to.be.revertedWith("zero address is not allowed")
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

    it("impossible to set XBasketAddresst, zero address", async function () {
        await expect(xToken.changeXBasketAddress(zeroAddress())).to.be.revertedWith("zero address is not allowed")
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

    it("impossible set NFT Contract, zero address", async function () {
        await expect(xToken.changeLandXNFTAddress(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

    it("preview", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xToken.address)
        await mockedKeyProtocolVariablesContract.mock.xTokenMintFee.withArgs().returns(xTokenMintFee)
        await mockedOraclePricesContract.mock.prices.withArgs("CORN").returns(261023622)
        await mockedOraclePricesContract.mock.getXTokenPrice.withArgs(xToken.address).returns(4430000)
        await mockedKeyProtocolVariablesContract.mock.securityDepositMonths.withArgs().returns(12)
        expect((await xToken.preview(1))[0]).to.equal(900000000000)
        expect((await xToken.preview(1))[1]).to.equal(27000000000)
        expect((await xToken.preview(1))[2]).to.equal(106059258000)
        expect((await xToken.preview(1))[3]).to.equal(766940742000)
    })

    it("preview reverted", async function () {
        await nft.setDetailsAndMint(2, 0, 0, 3000, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "CORN", acc2.address)
        await expect(xToken.preview(2)).to.be.revertedWith("this NFT has no land area set")
    })

    it("preview reverted", async function () {
        await nft.setDetailsAndMint(2, 30000000, 30000000, 0, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "CORN", acc2.address)
        await expect(xToken.preview(2)).to.be.revertedWith("this NFT has no crop share set")
    })

    it("preview reverted", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xSOY.address)
        await nft.setDetailsAndMint(2, 30000000, 30000000, 2000, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "SOY", acc2.address)
        await expect(xToken.preview(2)).to.be.revertedWith("wrong crop")
    })

    it("preview reverted", async function () {
        await mockedXTokenRouterContract.mock.getXToken.withArgs("CORN").returns(xSOY.address)
        await nft.setDetailsAndMint(2, 30000000, 30000000, 2000, acc1.address, "0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824", "CORN", acc2.address)
        await expect(xToken.preview(2)).to.be.revertedWith("Unable to shard this NFT")
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
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
        await mockedRentFoundationContract.mock.payInitialRent.withArgs(1, 900000).returns()
        await mockedRentFoundationContract.mock.initialRentApplied.withArgs(1).returns(false)
        await xToken.connect(acc2).getShards(1)
        
        await expect(xToken.connect(owner).xBasketTransfer(acc2.address, 1000000)).to.be.reverted
	})
})