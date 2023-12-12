const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { constants, BigNumber } = require("ethers");
const { ethers} = require("hardhat");
const { time, BN } = require("@openzeppelin/test-helpers");
const ether = require("@openzeppelin/test-helpers/src/ether");
const { inTransaction } = require("@openzeppelin/test-helpers/src/expectEvent");
const { getContractFactory } = require("@nomiclabs/hardhat-ethers/types");

let bridgeSource, bridgeDestination, lzEndpointContractSource, lzEndpointContractDest, sourceChainID, destinationChainId
let mockedLNDXSource, mockedLNDXDest

describe("LNDX Bridge", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, minter] = await ethers.getSigners()

        sourceChainID = 10021
        destinationChainId = 10043

        const lzEndpoint = await ethers.getContractFactory("LZEndpointMock")
		lzEndpointContractSource = await lzEndpoint.deploy(sourceChainID)
        lzEndpointContractDest = await lzEndpoint.deploy(destinationChainId)

        const xBasketSource = require("../../artifacts/contracts/LNDX.sol/LNDX.json")
        mockedLNDXSource = await deployMockContract(owner, xBasketSource.abi)

        const xBasketDest = require("../../artifacts/contracts/L2/LNDX.sol/LNDX.json")
        mockedLNDXDest = await deployMockContract(owner, xBasketDest.abi)

        LNDXBridgeContract = await ethers.getContractFactory("contracts/L2/LNDXBridge.sol:LndxBridge")
        bridgeSource = await LNDXBridgeContract.deploy(lzEndpointContractSource.address, mockedLNDXSource.address)
        bridgeDestination = await LNDXBridgeContract.deploy(lzEndpointContractDest.address, mockedLNDXDest.address)

        await lzEndpointContractSource.setDestLzEndpoint(bridgeDestination.address, lzEndpointContractDest.address)
        await lzEndpointContractDest.setDestLzEndpoint(bridgeSource.address, lzEndpointContractSource.address)

        await bridgeSource.setTrustedRemoteAddress(destinationChainId, bridgeDestination.address)
        await bridgeDestination.setTrustedRemoteAddress(sourceChainID, bridgeSource.address)
    })

    it("estimate fee", async function () {
        expect((await bridgeSource.estimateFee(destinationChainId, acc1.address, 1000000))["nativeFee"]).to.equal(ethers.utils.parseEther("0.013201804"));
        expect((await bridgeSource.estimateFee(destinationChainId, acc1.address, 1000000))["zroFee"]).to.equal(0);
    })

    it("sendToken from source to dest", async function () {
        // mock transferFrom on source chain
        await mockedLNDXSource.mock.transferFrom.withArgs(acc1.address, bridgeSource.address, 1000000).returns(true)

        //mock mint on dest since LzEndpointMock.send() will short circuit to lzReceive()
        await mockedLNDXDest.mock.mint.withArgs(acc1.address, 1000000).returns()
        await expect(bridgeSource.connect(acc1).sendToken(destinationChainId, acc1.address, 1000000, {value: ethers.utils.parseEther("0.013201804")})).not.to.reverted
    })

    it("sendToken from dest to source (main)", async function () {
        // mock burn on dest chain
        await mockedLNDXDest.mock.burnFrom.withArgs(acc1.address, 1000000).returns()
        
         //mock transfer on source since LzEndpointMock.send() will short circuit to lzReceive()
        await mockedLNDXSource.mock.transfer.withArgs(acc1.address, 1000000).returns(true)
        await expect(bridgeDestination.connect(acc1).sendToken(sourceChainID, acc1.address, 1000000, {value: ethers.utils.parseEther("0.013201804")})).not.to.reverted
    })
})