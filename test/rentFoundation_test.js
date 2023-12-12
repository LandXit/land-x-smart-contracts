const { deployMockContract } = waffle;
const { expect } = require("chai");
const { zeroAddress, isZeroAddress } = require("ethereumjs-util");
const { constants } = require("ethers");
const { ethers, network} = require("hardhat")
const { time, BN, ether } = require("@openzeppelin/test-helpers");


let mockedXTokenRouterContract, mockedUSDCContract, mockedKeyProtocalValues, xSOY, cSOY, mockedOraclePricesContract, mockedNFTContract, mockedLNDXTokenContract
let rentFoundationContract, owner, acc1, xTokenContractAddress, validatorCommisionWallet, hedgeFundWallet, landxChoiceWallet, landxOperationalWallet, cSoySigner, xTokensSecurityWallet, distributor

describe("RentFoundation", function () {
	beforeEach(async function () {
        console.log("", '\n')
		;[owner, acc1, acc2, xTokenContractAddress, validatorCommisionWallet, hedgeFundWallet, landxChoiceWallet, landxOperationalWallet, cSoySigner, xTokensSecurityWallet] = await ethers.getSigners()
        distributor = ethers.Wallet.createRandom()
		
        const xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
		mockedXTokenRouterContract = await deployMockContract(owner, xTokenRouterContract.abi)

        const ERC20Contract = require("../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json")
        mockedUSDCContract = await deployMockContract(owner, ERC20Contract.abi)
		
        const keyProtocolVariablesContract = require("../artifacts/contracts/KeyProtocolVariables.sol/KeyProtocolVariables.json")
		mockedKeyProtocalValues = await deployMockContract(owner, keyProtocolVariablesContract.abi)

        const LNDXContract = require("../artifacts/contracts/LNDX.sol/LNDX.json")
        mockedLNDXTokenContract = await deployMockContract(owner, LNDXContract.abi)

        const xTokenContract = require("../artifacts/contracts/xToken.sol/XToken.json")
        xSOY = await deployMockContract(owner, xTokenContract.abi)

        const oraclePricesContract = require("../artifacts/contracts/OraclePrices.sol/OraclePrices.json")
        mockedOraclePricesContract = await deployMockContract(owner, oraclePricesContract.abi)

        let nft= require("../artifacts/contracts/LandXNFT.sol/LandXNFT.json")
        mockedNFTContract= await deployMockContract(owner, nft.abi)

        let rentFoundation = await ethers.getContractFactory("RentFoundation")
        rentFoundationContract = await rentFoundation.deploy(mockedUSDCContract.address, mockedLNDXTokenContract.address, mockedOraclePricesContract.address, mockedNFTContract.address, mockedXTokenRouterContract.address, mockedKeyProtocalValues.address, distributor.address)
        await rentFoundationContract.deployed()
    })

    it("owner can't renounceOwnership", async function () {
        await expect(rentFoundationContract.connect(owner).renounceOwnership()).to.be.revertedWith("can 't renounceOwnership here")
	})

    it("set NFT Contract", async function () {
        console.log("updates NFT contract by contract owner")
        let nft= require("../artifacts/contracts/LandXNFT.sol/LandXNFT.json")
        let mockedNFTContract2= await deployMockContract(owner, nft.abi)
        await rentFoundationContract.changeLandXNFTAddress(mockedNFTContract2.address)
        expect(await rentFoundationContract.landXNFT()).to.equal(mockedNFTContract2.address)
	})

    it("impossible set NFT Contract", async function () {
        console.log("try to update NFT contract by NOT contract owner")
        let nft= require("../artifacts/contracts/LandXNFT.sol/LandXNFT.json")
        let mockedNFTContract2 = await deployMockContract(owner, nft.abi)
        await expect(rentFoundationContract.connect(acc1).changeLandXNFTAddress(mockedNFTContract2.address)).to.be.reverted
	})

    it("impossible set NFT Contract, zero address", async function () {
        await expect(rentFoundationContract.connect(owner).changeLandXNFTAddress(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

    it("set XTokenRouter", async function () {
        console.log("updates xTokenRouter contract by contract owner")
        let xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
        let mockedXTokenRouterContract2 = await deployMockContract(owner, xTokenRouterContract.abi)
        await rentFoundationContract.setXTokenRouter(mockedXTokenRouterContract2.address)
        expect(await rentFoundationContract.xTokenRouter()).to.equal(mockedXTokenRouterContract2.address)
	})

    it("impossible to set XTokenRouter", async function () {
        console.log("try to update xTokenRouter contract by NOT contract owner")
        let xTokenRouterContract = require("../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
        let mockedXTokenRouterContract2 = await deployMockContract(owner, xTokenRouterContract.abi)
        await expect(rentFoundationContract.connect(acc1).setXTokenRouter(mockedXTokenRouterContract2.address)).to.be.reverted
	})

    it("impossible to set xTokenRouter, zero address", async function () {
        await expect(rentFoundationContract.connect(owner).setXTokenRouter(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

    it("set OraclePrices contract", async function () {
        console.log("updates OraclePrice contract by contract owner")
        const oraclePricesContract = require("../artifacts/contracts/OraclePrices.sol/OraclePrices.json")
        let mockedOraclePricesContract2 = await deployMockContract(owner, oraclePricesContract.abi)
        await rentFoundationContract.setGrainPrices(mockedOraclePricesContract2.address)
        expect(await rentFoundationContract.grainPrices()).to.equal(mockedOraclePricesContract2.address)
	})

    it("it is not possible to set OraclePrices contract (not owner contract)", async function () {
        console.log("try to update OraclePrice contract by NOT contract owner")
        const oraclePricesContract = require("../artifacts/contracts/OraclePrices.sol/OraclePrices.json")
        let mockedOraclePricesContract2 = await deployMockContract(owner, oraclePricesContract.abi)
        await expect(rentFoundationContract.connect(acc1).setGrainPrices(mockedOraclePricesContract2.address)).to.be.reverted
	})

    it("it is not possible to set OraclePrices contract, zero address", async function () {
        await expect(rentFoundationContract.connect(owner).setGrainPrices(zeroAddress())).to.be.revertedWith("zero address is not allowed")
	})

    it("pay initial rent", async function () {
        console.log("pay initial rent for NFT with ID=1")
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)
        expect( await rentFoundationContract.initialRentApplied(1)).to.be.equal(true)
	})

    it("pay initial rent, not initial payer", async function () {
        console.log("try to pay initial rent for NFT with ID=1 by not initial payer, only xToken contract can pay initial rent")
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xSOY.address)
        await expect(rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)).to.be.revertedWith("not initial payer")
	})

    it("pay initial rent, initial rent is applied before", async function () {
        console.log("try to pay initial rent for NFT with ID=1 but initial rent was already applied, initial rent can be paid once")
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xSOY.address)
        await expect(rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 250)).to.be.revertedWith("Initial Paymant already applied")
	})

    it("pay rent, initial rent was not applied", async function () {
        console.log("try to pay rent for NFT with ID=1 but initial rent was not applied, it is impossible to pay rent for NFT that was not converted to xTokens")
        await expect(rentFoundationContract.connect(acc1).payRent(1, 1000000)).to.be.revertedWith("Initial rent was not applied")
    })

    it("pay rent, not enough USDC to transfer", async function () {
        console.log("try to pay 1000000 USDC of rent for NFT with ID=1 but account has not enaough of USDC")
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedKeyProtocalValues.mock.xTokensSecurityWallet.withArgs().returns(acc2.address)
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)

        await mockedUSDCContract.mock.transferFrom.withArgs(acc1.address, rentFoundationContract.address, 1000000).returns(false)
        
        await expect(rentFoundationContract.connect(acc1).payRent(1, 1000000)).to.be.revertedWith("transfer failed")
    })

    it("pay rent", async function () {
        console.log("pay 1000000 USDC of rent for NFT with ID=1")
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)

        await mockedUSDCContract.mock.transferFrom.withArgs(acc1.address, rentFoundationContract.address, 100000000).returns(true)
        await mockedKeyProtocalValues.mock.payRentFee.withArgs().returns(150)
        await mockedKeyProtocalValues.mock.validatorCommission.withArgs().returns(25)
        await mockedKeyProtocalValues.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocalValues.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedKeyProtocalValues.mock.validatorCommisionWallet.withArgs().returns(validatorCommisionWallet.address)
        
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 14737500).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(validatorCommisionWallet.address, 250000).returns(true)

        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedOraclePricesContract.mock.prices.withArgs("SOY").returns(577244585)

        await mockedKeyProtocalValues.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocalValues.mock.landXOperationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocalValues.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocalValues.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)

        await mockedUSDCContract.mock.transfer.withArgs(mockedLNDXTokenContract.address, 975000).returns(true)
        await mockedLNDXTokenContract.mock.feeToDistribute.withArgs(975000).returns();
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 450000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 75000).returns(true)
        await mockedKeyProtocalValues.mock.xTokensSecurityWallet.withArgs().returns(acc2.address)
        
        await expect(rentFoundationContract.connect(acc1).payRent(1, 100000000)).not.to.be.reverted
        expect((await rentFoundationContract.deposits(1))["amount"]).to.be.equal(270)
        expect((await rentFoundationContract.spentSecurityDeposit(1))).to.be.equal(false)
    })

    it("pay rent, security deposit", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)

        await mockedUSDCContract.mock.transferFrom.withArgs(xTokensSecurityWallet.address, rentFoundationContract.address, 100000000).returns(true)
        await mockedKeyProtocalValues.mock.payRentFee.withArgs().returns(150)
        await mockedKeyProtocalValues.mock.validatorCommission.withArgs().returns(25)
        await mockedKeyProtocalValues.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocalValues.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedKeyProtocalValues.mock.validatorCommisionWallet.withArgs().returns(validatorCommisionWallet.address)
        
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 14737500).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(validatorCommisionWallet.address, 250000).returns(true)

        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedOraclePricesContract.mock.prices.withArgs("SOY").returns(577244585)

        await mockedKeyProtocalValues.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocalValues.mock.landXOperationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocalValues.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocalValues.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)

        await mockedUSDCContract.mock.transfer.withArgs(mockedLNDXTokenContract.address, 975000).returns(true)
        await mockedLNDXTokenContract.mock.feeToDistribute.withArgs(975000).returns();
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 450000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 75000).returns(true)
        await mockedKeyProtocalValues.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        
        await expect(rentFoundationContract.connect(xTokensSecurityWallet).payRent(1, 100000000)).not.to.be.reverted
        expect((await rentFoundationContract.deposits(1))["amount"]).to.be.equal(270)
        expect((await rentFoundationContract.spentSecurityDeposit(1))).to.be.equal(true)
    })

    it("impossible pay rent, security deposit", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)

        await mockedUSDCContract.mock.transferFrom.withArgs(xTokensSecurityWallet.address, rentFoundationContract.address, 100000000).returns(true)
        await mockedKeyProtocalValues.mock.payRentFee.withArgs().returns(150)
        await mockedKeyProtocalValues.mock.validatorCommission.withArgs().returns(25)
        await mockedKeyProtocalValues.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocalValues.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedKeyProtocalValues.mock.validatorCommisionWallet.withArgs().returns(validatorCommisionWallet.address)
        
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 14737500).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(validatorCommisionWallet.address, 250000).returns(true)

        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedOraclePricesContract.mock.prices.withArgs("SOY").returns(577244585)

        await mockedKeyProtocalValues.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocalValues.mock.landXOperationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocalValues.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocalValues.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)

        await mockedUSDCContract.mock.transfer.withArgs(mockedLNDXTokenContract.address, 975000).returns(true)
        await mockedLNDXTokenContract.mock.feeToDistribute.withArgs(975000).returns();
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 450000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 75000).returns(true)
        await mockedKeyProtocalValues.mock.xTokensSecurityWallet.withArgs().returns(xTokensSecurityWallet.address)
        
        await expect(rentFoundationContract.connect(xTokensSecurityWallet).payRent(1, 100000000)).not.to.be.reverted
        expect((await rentFoundationContract.deposits(1))["amount"]).to.be.equal(270)
        await expect(rentFoundationContract.connect(xTokensSecurityWallet).payRent(1, 100000000)).to.be.revertedWith("securityDeposit is already spent")
    })

    it("Buy Out reverts", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)

        await mockedUSDCContract.mock.transferFrom.withArgs(acc1.address, rentFoundationContract.address, 100000000).returns(true)
        await mockedKeyProtocalValues.mock.payRentFee.withArgs().returns(150)
        await mockedKeyProtocalValues.mock.validatorCommission.withArgs().returns(25)
        await mockedKeyProtocalValues.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocalValues.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedKeyProtocalValues.mock.validatorCommisionWallet.withArgs().returns(validatorCommisionWallet.address)
        
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 14737500).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(validatorCommisionWallet.address, 250000).returns(true)

        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedOraclePricesContract.mock.prices.withArgs("SOY").returns(577244585)

        await mockedKeyProtocalValues.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocalValues.mock.landXOperationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocalValues.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocalValues.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)

        await mockedUSDCContract.mock.transfer.withArgs(mockedLNDXTokenContract.address, 975000).returns(true)
        await mockedLNDXTokenContract.mock.feeToDistribute.withArgs(975000).returns();
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 450000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 75000).returns(true)
        await mockedKeyProtocalValues.mock.xTokensSecurityWallet.withArgs().returns(acc2.address)
        
        await expect(rentFoundationContract.connect(acc1).payRent(1, 100000000)).not.to.be.reverted
        expect((await rentFoundationContract.deposits(1))["amount"]).to.be.equal(270)
        expect((await rentFoundationContract.spentSecurityDeposit(1))).to.be.equal(false)

        time.increase(32832000)
        await mockedNFTContract.mock.cropShare.withArgs(1).returns(900)
        await mockedNFTContract.mock.tillableArea.withArgs(1).returns(900000)
        await expect(rentFoundationContract.connect(xTokenContractAddress).buyOut(1)).to.be.revertedWith("NFT has a debt")
    })

    it("Buy Out, reverts not initial payer", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)
        await expect(rentFoundationContract.connect(acc1).buyOut(1)).to.be.revertedWith("not initial payer")
    })

    it("Buy Out, reverts not initial rent applied", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await expect(rentFoundationContract.connect(acc1).buyOut(1)).to.be.revertedWith("Initial Paymant isn't applied")
    })

    it("Buy Out", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)
    
        await mockedUSDCContract.mock.transferFrom.withArgs(acc1.address, rentFoundationContract.address, 100000000).returns(true)
        await mockedKeyProtocalValues.mock.payRentFee.withArgs().returns(150)
        await mockedKeyProtocalValues.mock.validatorCommission.withArgs().returns(25)
        await mockedKeyProtocalValues.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocalValues.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedKeyProtocalValues.mock.validatorCommisionWallet.withArgs().returns(validatorCommisionWallet.address)
        
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 14737500).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(validatorCommisionWallet.address, 250000).returns(true)

        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedOraclePricesContract.mock.prices.withArgs("SOY").returns(577244585)
        await mockedKeyProtocalValues.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocalValues.mock.landXOperationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocalValues.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocalValues.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)

        await mockedUSDCContract.mock.transfer.withArgs(mockedLNDXTokenContract.address, 975000).returns(true)
        await mockedLNDXTokenContract.mock.feeToDistribute.withArgs(975000).returns();
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 450000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 75000).returns(true)
        await mockedKeyProtocalValues.mock.xTokensSecurityWallet.withArgs().returns(acc2.address)
        
        await expect(rentFoundationContract.connect(acc1).payRent(1, 100000000)).not.to.be.reverted
        expect((await rentFoundationContract.deposits(1))["amount"]).to.be.equal(270)
        expect((await rentFoundationContract.spentSecurityDeposit(1))).to.be.equal(false)

        time.increase(432000)
        await mockedNFTContract.mock.cropShare.withArgs(1).returns(900)
        await mockedNFTContract.mock.tillableArea.withArgs(1).returns(90000)
        await mockedUSDCContract.mock.transfer.withArgs(xTokenContractAddress.address, 92359133).returns(true)
        await rentFoundationContract.connect(xTokenContractAddress).buyOut(1)
        expect((await rentFoundationContract.deposits(1))[0]).to.be.equal(0)
        expect((await rentFoundationContract.deposits(1))[1]).to.be.equal(0)
        expect(await rentFoundationContract.initialRentApplied(1)).to.be.equal(false)
    })

    it("Buy Out Preview, reverts not initial payer", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)
        await expect(rentFoundationContract.connect(acc1).buyOutPreview(1)).to.be.revertedWith("not initial payer")
    })

    it("Buy Out, reverts not initial rent applied", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await expect(rentFoundationContract.connect(acc1).buyOutPreview(1)).to.be.revertedWith("Initial Paymant isn't applied")
    })

    it("Buy Out Preview", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)
    
        await mockedUSDCContract.mock.transferFrom.withArgs(acc1.address, rentFoundationContract.address, 100000000).returns(true)
        await mockedKeyProtocalValues.mock.payRentFee.withArgs().returns(150)
        await mockedKeyProtocalValues.mock.validatorCommission.withArgs().returns(25)
        await mockedKeyProtocalValues.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocalValues.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedKeyProtocalValues.mock.validatorCommisionWallet.withArgs().returns(validatorCommisionWallet.address)
        
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 14737500).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(validatorCommisionWallet.address, 250000).returns(true)

        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedOraclePricesContract.mock.prices.withArgs("SOY").returns(577244585)
        await mockedKeyProtocalValues.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocalValues.mock.landXOperationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocalValues.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocalValues.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)

        await mockedUSDCContract.mock.transfer.withArgs(mockedLNDXTokenContract.address, 975000).returns(true)
        await mockedLNDXTokenContract.mock.feeToDistribute.withArgs(975000).returns();
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 450000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 75000).returns(true)
        await mockedKeyProtocalValues.mock.xTokensSecurityWallet.withArgs().returns(acc2.address)
        
        await expect(rentFoundationContract.connect(acc1).payRent(1, 100000000)).not.to.be.reverted
        expect((await rentFoundationContract.deposits(1))["amount"]).to.be.equal(270)
        expect((await rentFoundationContract.spentSecurityDeposit(1))).to.be.equal(false)

        time.increase(432000)
        await mockedNFTContract.mock.cropShare.withArgs(1).returns(900)
        await mockedNFTContract.mock.tillableArea.withArgs(1).returns(90000)
    
        let data =  await rentFoundationContract.connect(xTokenContractAddress).buyOutPreview(1)
        expect(data[0]).to.be.equal(true)
        expect(data[1]).to.be.equal(92359133)
    })

    it("Buy Out Preview", async function () {
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 100)
    
        await mockedUSDCContract.mock.transferFrom.withArgs(acc1.address, rentFoundationContract.address, 100000000).returns(true)
        await mockedKeyProtocalValues.mock.payRentFee.withArgs().returns(150)
        await mockedKeyProtocalValues.mock.validatorCommission.withArgs().returns(25)
        await mockedKeyProtocalValues.mock.hedgeFundAllocation.withArgs().returns(1500)
        await mockedKeyProtocalValues.mock.hedgeFundWallet.withArgs().returns(hedgeFundWallet.address)
        await mockedKeyProtocalValues.mock.validatorCommisionWallet.withArgs().returns(validatorCommisionWallet.address)
        
        await mockedUSDCContract.mock.transfer.withArgs(hedgeFundWallet.address, 14737500).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(validatorCommisionWallet.address, 250000).returns(true)

        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedOraclePricesContract.mock.prices.withArgs("SOY").returns(577244585)
        await mockedKeyProtocalValues.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocalValues.mock.landXOperationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocalValues.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocalValues.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)

        await mockedUSDCContract.mock.transfer.withArgs(mockedLNDXTokenContract.address, 975000).returns(true)
        await mockedLNDXTokenContract.mock.feeToDistribute.withArgs(975000).returns();
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 450000).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 75000).returns(true)
        await mockedKeyProtocalValues.mock.xTokensSecurityWallet.withArgs().returns(acc2.address)
        
        await expect(rentFoundationContract.connect(acc1).payRent(1, 100000000)).not.to.be.reverted
        expect((await rentFoundationContract.deposits(1))["amount"]).to.be.equal(270)
        expect((await rentFoundationContract.spentSecurityDeposit(1))).to.be.equal(false)

        time.increase(32832000)
        await mockedNFTContract.mock.cropShare.withArgs(1).returns(900)
        await mockedNFTContract.mock.tillableArea.withArgs(1).returns(90000)
    
        let data =  await rentFoundationContract.connect(xTokenContractAddress).buyOutPreview(1)
        expect(data[0]).to.be.equal(false)
        expect(data[1]).to.be.equal(0)
    })

    it("get deposit balance", async function () {
        console.log("get deposit amount for NFT with ID=1:, it become less each second: start deposit is 81000, after 100000 seconds it becomes 80744")
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 81000)
        await mockedNFTContract.mock.cropShare.withArgs(1).returns(900)
        await mockedNFTContract.mock.tillableArea.withArgs(1).returns(900000)

        expect((await rentFoundationContract.getDepositBalance(1))).to.be.equal(81000)

        await time.increase(100000)
        expect((await rentFoundationContract.getDepositBalance(1))).to.be.equal(80744)
    })

    it("get deposit balance, negative value if there wasn't payments", async function () {
        console.log("get deposit amount for NFT with ID=1:, it become less each second: can be negative, start deposit is 81000, after 32336000 seconds it becomes -2051")
        await mockedNFTContract.mock.crop.withArgs(1).returns("SOY")
        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
        await rentFoundationContract.connect(xTokenContractAddress).payInitialRent(1, 81000)
        await mockedNFTContract.mock.cropShare.withArgs(1).returns(900)
        await mockedNFTContract.mock.tillableArea.withArgs(1).returns(900000)

        expect((await rentFoundationContract.getDepositBalance(1))).to.be.equal(81000)

        await time.increase(32336000)
        expect((await rentFoundationContract.getDepositBalance(1))).to.be.equal(-2051)
    })

    it("sell cTokens", async function () {
        let cTokenContract = await ethers.getContractFactory("contracts/cToken.sol:CToken")
        cToken = await cTokenContract.deploy(rentFoundationContract.address, mockedXTokenRouterContract.address, "SOY")
		await cToken.deployed()

        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
		
		await cToken.connect(xTokenContractAddress).mint(acc1.address, 1000000)

        await mockedOraclePricesContract.mock.prices.withArgs("SOY").returns(577244585)
        await mockedKeyProtocalValues.mock.cTokenSellFee.withArgs().returns(1000)
        await mockedXTokenRouterContract.mock.getCToken.withArgs("SOY").returns(cToken.address)
       
        await mockedUSDCContract.mock.transfer.withArgs(acc1.address, 519520).returns(true)
        await mockedKeyProtocalValues.mock.lndxHoldersPercentage.withArgs().returns(6500)
        await mockedKeyProtocalValues.mock.landXOperationsPercentage.withArgs().returns(3000)
        await mockedKeyProtocalValues.mock.landxOperationalWallet.withArgs().returns(landxOperationalWallet.address)
        await mockedKeyProtocalValues.mock.landxChoiceWallet.withArgs().returns(landxChoiceWallet.address)

        await mockedUSDCContract.mock.transfer.withArgs(mockedLNDXTokenContract.address, 37520).returns(true)
        await mockedLNDXTokenContract.mock.feeToDistribute.withArgs(37520).returns();
        await mockedUSDCContract.mock.transfer.withArgs(landxOperationalWallet.address, 17317).returns(true)
        await mockedUSDCContract.mock.transfer.withArgs(landxChoiceWallet.address, 2887).returns(true)
        await expect(cToken.connect(acc1).burn(1000000)).not.to.be.reverted
    })

    it("can't sell cTokens, no valid cToken", async function () {
        let cTokenContract = await ethers.getContractFactory("contracts/cToken.sol:CToken")
        cToken = await cTokenContract.deploy(rentFoundationContract.address, mockedXTokenRouterContract.address, "SOY")
		await cToken.deployed()

        await mockedXTokenRouterContract.mock.getXToken.withArgs("SOY").returns(xTokenContractAddress.address)
		
		await cToken.connect(xTokenContractAddress).mint(acc1.address, 1000000)
        await mockedXTokenRouterContract.mock.getCToken.withArgs("SOY").returns(acc2.address)
       
        await expect(cToken.connect(acc1).burn(1000000)).to.be.revertedWith("no valid cToken")
    })
})