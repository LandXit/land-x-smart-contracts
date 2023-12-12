const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { constants, BigNumber } = require("ethers");
const { ethers} = require("hardhat");
const { time, BN } = require("@openzeppelin/test-helpers");
const ether = require("@openzeppelin/test-helpers/src/ether");

let xToken, mockedXTokenRouterContract

describe("xToken", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, minter] = await ethers.getSigners()

        const xTokenRouterContract = require("../../artifacts/contracts/xTokenRouter.sol/xTokenRouter.json")
		mockedXTokenRouterContract = await deployMockContract(owner, xTokenRouterContract.abi)

        xTokenContract = await ethers.getContractFactory("contracts/L2/xToken.sol:XToken")
        xToken = await xTokenContract.deploy(mockedXTokenRouterContract.address, "SOY")

        await xToken.connect(owner).grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", minter.address)
    })

    it("Only minter role can mint, success", async function () {
        await xToken.connect(minter).mint(acc1.address, 100000000)
        expect(await xToken.balanceOf(acc1.address)).to.equal(100000000)
    })

    it("Not minter can't mint, revert", async function () {
        await expect(xToken.connect(acc2).mint(acc1.address, 100000000)).to.be.reverted
        expect(await xToken.balanceOf(acc1.address)).to.equal(0)
    })

    it("Burn From, success", async function () {
        await xToken.connect(minter).mint(acc1.address, 100000000)
        expect(await xToken.balanceOf(acc1.address)).to.equal(100000000)

        await xToken.connect(acc1).approve(acc2.address, 100000000)
        await xToken.connect(acc2).burnFrom(acc1.address, 100000000)
        expect(await xToken.balanceOf(acc1.address)).to.equal(0)
    })

    it("Burn From, revert", async function () {
        await xToken.connect(minter).mint(acc1.address, 100000000)
        expect(await xToken.balanceOf(acc1.address)).to.equal(100000000)

        await expect(xToken.connect(acc2).burnFrom(acc1.address, 100000000)).to.be.reverted
        expect(await xToken.balanceOf(acc1.address)).to.equal(100000000)
    })

    it("Stake works", async function () {     
        await xToken.connect(minter).mint(acc1.address, 100000000)
        expect(await xToken.balanceOf(acc1.address)).to.equal(100000000)
    
        await expect(xToken.connect(acc1).stake(1000000)).not.to.reverted
        expect(await xToken.balanceOf(acc1.address)).to.equal(99000000)
        expect((await xToken.Staked(acc1.address))[0]).to.equal(1000000)
        expect((await xToken.TotalStaked())[0]).to.equal(1000000)
        expect((await xToken.NonStakedTokens())[0]).to.equal(0)
    })

    it("Stake doesn't work (not enough funds)", async function () {
        await xToken.connect(minter).mint(acc1.address, 100000000)
        expect(await xToken.balanceOf(acc1.address)).to.equal(100000000)
    
        await expect(xToken.connect(acc1).stake(10000000000)).to.be.reverted
        expect((await xToken.Staked(acc1.address))[0]).to.equal(0)
        expect((await xToken.TotalStaked())[0]).to.equal(0)
    })

    it("Unstake works", async function () {
        await xToken.connect(minter).mint(acc1.address, 100000000)
        expect(await xToken.balanceOf(acc1.address)).to.equal(100000000)

        const cTokenContract = require("../../artifacts/contracts/L2/cToken.sol/CToken.json")
        mockedCTokenContract = await deployMockContract(owner, cTokenContract.abi)
    
        await expect(xToken.connect(acc1).stake(1000000)).not.to.reverted
       
        await time.increase(1000)
        await mockedXTokenRouterContract.mock.getCToken.withArgs("SOY").returns(mockedCTokenContract.address)
        await mockedCTokenContract.mock.mint.withArgs(acc1.address, 31).returns()
        expect(await xToken.availableToClaim(acc1.address)).to.equal(31)
        await expect(xToken.connect(acc1).unstake(1000000)).not.to.reverted
        expect(await xToken.balanceOf(acc1.address)).to.equal(100000000)
        expect((await xToken.Staked(acc1.address))[0]).to.equal(0)
        expect((await xToken.TotalStaked())[0]).to.equal(0)
        expect(await xToken.Claimed(acc1.address)).to.equal(31)
    })

    it("get decimals  works", async function () {
        expect(await xToken.decimals()).to.equal(6)
	})
})