const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { constants, BigNumber } = require("ethers");
const { ethers} = require("hardhat");
const { time, BN } = require("@openzeppelin/test-helpers");
const ether = require("@openzeppelin/test-helpers/src/ether");
const { inTransaction } = require("@openzeppelin/test-helpers/src/expectEvent");
const { getContractFactory } = require("@nomiclabs/hardhat-ethers/types");

let bridgeSource, bridgeDestination, lzEndpointContractSource, lzEndpointContractDest, sourceChainID, destinationChainId
let mockedCTokenSource, mockedCTokenDest, mockedXTokenSource, mockedXTokenDest, mockedTokenRouterSource, mockedTokenRouterDest

describe("xToken Bridge", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, minter] = await ethers.getSigners()

        sourceChainID = 10021
        destinationChainId = 10043

        const lzEndpoint = await ethers.getContractFactory("LZEndpointMock")
		lzEndpointContractSource = await lzEndpoint.deploy(sourceChainID)
        lzEndpointContractDest = await lzEndpoint.deploy(destinationChainId)

        const xTokenRouterContract = require("../../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
		mockedTokenRouterSource = await deployMockContract(owner, xTokenRouterContract.abi)
        mockedTokenRouterDest = await deployMockContract(owner, xTokenRouterContract.abi)

        const cTokenSource = require("../../artifacts/contracts/cToken.sol/CToken.json")
        mockedCTokenSource = await deployMockContract(owner, cTokenSource.abi)

        const cTokenDest = require("../../artifacts/contracts/L2/cToken.sol/CToken.json")
        mockedCTokenDest = await deployMockContract(owner, cTokenDest.abi)

        const xTokenSource = require("../../artifacts/contracts/xToken.sol/XToken.json")
        mockedXTokenSource = await deployMockContract(owner, xTokenSource.abi)

        const xTokenDest = require("../../artifacts/contracts/L2/xToken.sol/XToken.json")
        mockedXTokenDest = await deployMockContract(owner, xTokenDest.abi)

        const xTokenBridgeContract = await ethers.getContractFactory("contracts/L2/xTokenBridge.sol:XTokenBridge")
        bridgeSource = await xTokenBridgeContract.deploy(lzEndpointContractSource.address, mockedTokenRouterSource.address)
        bridgeDestination = await xTokenBridgeContract.deploy(lzEndpointContractDest.address, mockedTokenRouterDest.address)

        await lzEndpointContractSource.setDestLzEndpoint(bridgeDestination.address, lzEndpointContractDest.address)
        await lzEndpointContractDest.setDestLzEndpoint(bridgeSource.address, lzEndpointContractSource.address)

        await bridgeSource.setTrustedRemoteAddress(destinationChainId, bridgeDestination.address)
        await bridgeDestination.setTrustedRemoteAddress(sourceChainID, bridgeSource.address)
    })

    it("estimate fee", async function () {
        await mockedCTokenSource.mock.symbol.returns("cSOY")
        await mockedCTokenSource.mock.crop.returns("SOY")
        expect((await bridgeSource.estimateFee(mockedCTokenSource.address, destinationChainId, acc1.address, 1000000))["nativeFee"]).to.equal(ethers.utils.parseEther("0.013203916"));
        expect((await bridgeSource.estimateFee(mockedCTokenSource.address, destinationChainId, acc1.address, 1000000))["zroFee"]).to.equal(0);
    })

    it("estimate fee", async function () {
        await mockedXTokenSource.mock.symbol.returns("xSOY")
        await mockedXTokenSource.mock.crop.returns("SOY")
        expect((await bridgeSource.estimateFee(mockedXTokenSource.address, destinationChainId, acc1.address, 1000000))["nativeFee"]).to.equal(ethers.utils.parseEther("0.013203916"));
        expect((await bridgeSource.estimateFee(mockedXTokenSource.address, destinationChainId, acc1.address, 1000000))["zroFee"]).to.equal(0);
    })

    it("send cToken from source to dest", async function () {
        await mockedCTokenSource.mock.symbol.returns("cSOY")
        await mockedCTokenSource.mock.crop.returns("SOY")
        await mockedTokenRouterSource.mock.getCToken.withArgs("SOY").returns(mockedCTokenSource.address)
        // mock transferFrom on source chain
        await mockedCTokenSource.mock.transferFrom.withArgs(acc1.address, bridgeSource.address, 1000000).returns(true)

        //mock mint on dest since LzEndpointMock.send() will short circuit to lzReceive()
        await mockedTokenRouterDest.mock.getCToken.withArgs("SOY").returns(mockedCTokenDest.address)
        await mockedTokenRouterDest.mock.getXToken.withArgs("SOY").returns(mockedXTokenDest.address)
        await mockedCTokenDest.mock.mint.withArgs(acc1.address, 1000000).returns()
        await expect(bridgeSource.connect(acc1).sendToken(mockedCTokenSource.address, destinationChainId, acc1.address, 1000000, {value: ethers.utils.parseEther("0.013203916")})).not.to.reverted
    })

    it("send cToken from source to dest, wrong contract", async function () {
        await mockedCTokenSource.mock.symbol.returns("cSOY")
        await mockedCTokenSource.mock.crop.returns("SOY")
        await mockedTokenRouterSource.mock.getCToken.withArgs("SOY").returns(acc2.address)
        await expect(bridgeSource.connect(acc1).sendToken(mockedCTokenSource.address, destinationChainId, acc1.address, 1000000, {value: ethers.utils.parseEther("0.013203916")})).to.be.revertedWith("not allowed token")
    })

    it("send cToken from dest to source (main)", async function () {
        await mockedCTokenDest.mock.symbol.returns("cSOY")
        await mockedCTokenDest.mock.crop.returns("SOY")
        await mockedTokenRouterDest.mock.getCToken.withArgs("SOY").returns(mockedCTokenDest.address)
        // mock burn on dest chain
        await mockedCTokenDest.mock.burnFrom.withArgs(acc1.address, 1000000).returns()
        
         //mock transfer on source since LzEndpointMock.send() will short circuit to lzReceive()
        await mockedTokenRouterSource.mock.getXToken.withArgs("SOY").returns(mockedXTokenSource.address)
        await mockedTokenRouterSource.mock.getCToken.withArgs("SOY").returns(mockedCTokenSource.address)
        await mockedCTokenSource.mock.balanceOf.withArgs(bridgeSource.address).returns(10000000)
        await mockedCTokenSource.mock.transfer.withArgs(acc1.address, 1000000).returns(true)
        await expect(bridgeDestination.connect(acc1).sendToken(mockedCTokenDest.address, sourceChainID, acc1.address, 1000000, {value: ethers.utils.parseEther("0.013203916")})).not.to.reverted
    })

    it("send cToken from dest to source (main) with calling claim", async function () {
        await mockedCTokenDest.mock.symbol.returns("cSOY")
        await mockedCTokenDest.mock.crop.returns("SOY")
        await mockedTokenRouterDest.mock.getCToken.withArgs("SOY").returns(mockedCTokenDest.address)
        // mock burn on dest chain
        await mockedCTokenDest.mock.burnFrom.withArgs(acc1.address, 1000000).returns()
        
         //mock transfer on source since LzEndpointMock.send() will short circuit to lzReceive()
        await mockedTokenRouterSource.mock.getXToken.withArgs("SOY").returns(mockedXTokenSource.address)
        await mockedTokenRouterSource.mock.getCToken.withArgs("SOY").returns(mockedCTokenSource.address)
        await mockedCTokenSource.mock.balanceOf.withArgs(bridgeSource.address).returns(10000)
        await mockedXTokenSource.mock.claim.returns();
        await mockedCTokenSource.mock.transfer.withArgs(acc1.address, 1000000).returns(true)
        await expect(bridgeDestination.connect(acc1).sendToken(mockedCTokenDest.address, sourceChainID, acc1.address, 1000000, {value: ethers.utils.parseEther("0.013203916")})).not.to.reverted
    })

    it("send xToken from source to dest, wrong token", async function () {
        await mockedXTokenSource.mock.symbol.returns("xSOY")
        await mockedXTokenSource.mock.crop.returns("SOY")
        await mockedTokenRouterSource.mock.getXToken.withArgs("SOY").returns(acc2.address)
    
        await expect(bridgeSource.connect(acc1).sendToken(mockedXTokenSource.address, destinationChainId, acc1.address, 1000000, {value: ethers.utils.parseEther("0.013203916")})).to.be.revertedWith("not allowed token")
    })

    it("send xToken from source to dest", async function () {
        await mockedXTokenSource.mock.symbol.returns("xSOY")
        await mockedXTokenSource.mock.crop.returns("SOY")
        await mockedTokenRouterSource.mock.getXToken.withArgs("SOY").returns(mockedXTokenSource.address)
        // mock transferFrom on source chain
        await mockedXTokenSource.mock.transferFrom.withArgs(acc1.address, bridgeSource.address, 1000000).returns(true)
        await mockedXTokenSource.mock.stake.withArgs(1000000).returns()

        //mock mint on dest since LzEndpointMock.send() will short circuit to lzReceive()
        await mockedTokenRouterDest.mock.getXToken.withArgs("SOY").returns(mockedXTokenDest.address)
        await mockedXTokenDest.mock.mint.withArgs(acc1.address, 1000000).returns()
        await expect(bridgeSource.connect(acc1).sendToken(mockedXTokenSource.address, destinationChainId, acc1.address, 1000000, {value: ethers.utils.parseEther("0.013203916")})).not.to.reverted
    })

    it("send xToken from dest to source (main)", async function () {
        await mockedXTokenDest.mock.symbol.returns("xSOY")
        await mockedXTokenDest.mock.crop.returns("SOY")
        await mockedTokenRouterDest.mock.getXToken.withArgs("SOY").returns(mockedXTokenDest.address)
        // mock burn on dest chain
        await mockedXTokenDest.mock.burnFrom.withArgs(acc1.address, 1000000).returns()
        
         //mock transfer on source since LzEndpointMock.send() will short circuit to lzReceive()
        await mockedTokenRouterSource.mock.getXToken.withArgs("SOY").returns(mockedXTokenSource.address)
        await mockedXTokenSource.mock.unstake.withArgs(1000000).returns()
        await mockedXTokenSource.mock.transfer.withArgs(acc1.address, 1000000).returns(true)
        await expect(bridgeDestination.connect(acc1).sendToken(mockedXTokenDest.address, sourceChainID, acc1.address, 1000000, {value: ethers.utils.parseEther("0.013203916")})).not.to.reverted
    })
})