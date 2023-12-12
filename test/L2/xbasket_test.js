const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { constants, BigNumber } = require("ethers");
const { ethers} = require("hardhat");
const { time, BN } = require("@openzeppelin/test-helpers");
const ether = require("@openzeppelin/test-helpers/src/ether");

let xBasket

describe("xBasket", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, minter] = await ethers.getSigners()

        xBasketContract = await ethers.getContractFactory("contracts/L2/xBasket.sol:xBasket")
        xBasket = await xBasketContract.deploy()

        await xBasket.connect(owner).grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", minter.address)
    })

    it("Only minter role can mint, success", async function () {
        await xBasket.connect(minter).mint(acc1.address, 100000000)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(100000000)
    })

    it("Not minter can't mint, revert", async function () {
        await expect(xBasket.connect(acc2).mint(acc1.address, 100000000)).to.be.reverted
        expect(await xBasket.balanceOf(acc1.address)).to.equal(0)
    })

    it("Burn From, success", async function () {
        await xBasket.connect(minter).mint(acc1.address, 100000000)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(100000000)

        await xBasket.connect(acc1).approve(acc2.address, 100000000)
        await xBasket.connect(acc2).burnFrom(acc1.address, 100000000)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(0)
    })

    it("Burn From, revert", async function () {
        await xBasket.connect(minter).mint(acc1.address, 100000000)
        expect(await xBasket.balanceOf(acc1.address)).to.equal(100000000)

        await expect(xBasket.connect(acc2).burnFrom(acc1.address, 100000000)).to.be.reverted
        expect(await xBasket.balanceOf(acc1.address)).to.equal(100000000)
    })

    it("get decimals  works", async function () {
        expect(await xBasket.decimals()).to.equal(6)
	})
})