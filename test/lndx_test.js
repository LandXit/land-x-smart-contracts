const { deployMockContract, provider } = waffle;
const { expect } = require("chai");
const { constants, BigNumber } = require("ethers");
const { ethers} = require("hardhat");
const { time, BN } = require("@openzeppelin/test-helpers");
const ether = require("@openzeppelin/test-helpers/src/ether");

let usdc, veLNDX, LNDX
const rewardsPerDay = 8547945205; //if rewards westing during 5 years

describe("LNDX", function () {
	beforeEach(async function () {
		;[owner, acc1, acc2, acc3, feeDistributor] = await ethers.getSigners()
		
        usdcContract = await ethers.getContractFactory("USDC")
        usdc = await usdcContract.deploy(owner.address)

        veLNDXContract = await ethers.getContractFactory("VeLNDX")
        veLNDX = await veLNDXContract.deploy()

        LNDXContract = await ethers.getContractFactory("contracts/LNDX.sol:LNDX")
        LNDX = await LNDXContract.deploy(usdc.address, veLNDX.address, 0)
        
        await veLNDX.grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", LNDX.address)
        await usdc.mint(feeDistributor.address, 100000000000) // 100 000

        await LNDX.grantRole("0x2174eddbd3dd5d6d1f8771fcfe11e56dde5a1c380f4e4ee908e41262add3ef0c", feeDistributor.address)

    })

    it("Grant LNDX with cliff=0 and vesting=0", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(0)
    })

    it("Grant LNDX with cliff=0 and vesting=48, partial claims", async function () {
        time.increase(172800)
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 48)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(100000000)
        // 18 month passed
        time.increase(46656000)
        await LNDX.connect(acc1).claimVestedTokens()

        expect(await LNDX.balanceOf(acc1.address)).to.equal(1730985325635)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(62500240)
        // 40 month passed
        time.increase(57024000)
        await LNDX.connect(acc1).claimVestedTokens()
        expect(await LNDX.balanceOf(acc1.address)).to.equal(8836474366957)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(16667200)

        //48 month passed
         time.increase(20822400)
         await LNDX.connect(acc1).claimVestedTokens()
         expect(await LNDX.balanceOf(acc1.address)).to.equal(12317689040361)
         expect(await veLNDX.balanceOf(acc1.address)).to.equal(0)
    })

    it("Impossible create second grant for the same address", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 2, 5)
        await expect(LNDX.grantLNDX(acc1.address, 100000000, 2, 5)).to.be.revertedWith("grant already exists")
    })

    it("Impossible create grant with cliff more then 60 months", async function () {
        await expect(LNDX.grantLNDX(acc1.address, 100000000, 61, 5)).to.be.revertedWith("cliff greater than 5 year")
    })

    it("Impossible create grant with vesting duration more then 60 months", async function () {
        await expect(LNDX.grantLNDX(acc1.address, 100000000, 5, 61)).to.be.revertedWith("duration greater than 5 years")
    })

    it("Impossible create grant with vesting duration more then 60 months", async function () {
        await expect(LNDX.grantLNDX(acc1.address, 100000000, 5, 61)).to.be.revertedWith("duration greater than 5 years")
    })

    it("Impossible to mint more than 64400000 LNDX", async function () {
        await expect(LNDX.grantLNDX(acc1.address, 64400000000001, 5, 61)).to.be.revertedWith("Mint limit amount exceeded")
    })

    it("Only Owner can create grant", async function () {
        await expect(LNDX.connect(acc2).grantLNDX(acc1.address, 100000000, 5, 61)).to.be.revertedWith("revert Ownable: caller is not the owner")
    })

    it("Grant LNDX with cliff=2 and vesting=5, total lock < 12 months", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 2, 5)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(25000000)
        expect(await LNDX.totalSupply()).to.equal(100000000)
        expect(await LNDX.totalGranted()).to.equal(100000000)
        expect(await LNDX.totalLocked()).to.equal(100000000)
        expect((await LNDX.grants(acc1.address))["veLndxClaimed"]).to.equal(25000000)
        expect((await LNDX.grants(acc1.address))["amount"]).to.equal(100000000)
    })

    it("Grant LNDX with cliff=1 and vesting=24, 12 months <= total lock < 48 months", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 1, 24)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(50000000)
        expect(await LNDX.totalSupply()).to.equal(100000000)
        expect(await LNDX.totalGranted()).to.equal(100000000)
        expect(await LNDX.totalLocked()).to.equal(100000000)
        expect((await LNDX.grants(acc1.address))["veLndxClaimed"]).to.equal(50000000)
        expect((await LNDX.grants(acc1.address))["amount"]).to.equal(100000000)
    })

    it("Grant LNDX with cliff=12 and vesting=36, total lock >= 48 months", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(100000000)
        expect(await LNDX.totalSupply()).to.equal(100000000)
        expect(await LNDX.totalGranted()).to.equal(100000000)
        expect(await LNDX.totalLocked()).to.equal(100000000)
        expect((await LNDX.grants(acc1.address))["veLndxClaimed"]).to.equal(100000000)
        expect((await LNDX.grants(acc1.address))["amount"]).to.equal(100000000)
    })

    it("Grant LNDX with cliff=12 and vesting=36, total lock >= 48 months", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(100000000)
        expect(await LNDX.totalSupply()).to.equal(100000000)
        expect(await LNDX.totalGranted()).to.equal(100000000)
        expect(await LNDX.totalLocked()).to.equal(100000000)
        expect((await LNDX.grants(acc1.address))["veLndxClaimed"]).to.equal(100000000)
        expect((await LNDX.grants(acc1.address))["amount"]).to.equal(100000000)
    })

    it("Reward distribution first call", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)

        expect((await LNDX.rewardVested())["amountVested"]).to.equal(0)
        expect((await LNDX.rewardVested())["daysClaimed"]).to.equal(0)
        expect((await LNDX.rewardVested())["lastVestedAt"]).not.to.equal(0)
        expect((await LNDX.rewardVested())["vestingStartedAt"]).not.to.equal(0)

        expect(await LNDX.rewardSharesPerToken()).to.equal(0)
    })

    it("Reward distribution first call, veLNDX totalSupply = 0", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        time.increase(259200) // 3 days
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)
        expect((await LNDX.rewardVested())["amountVested"]).to.equal(rewardsPerDay * 3)
        expect((await LNDX.rewardVested())["daysClaimed"]).to.equal(3)
        expect((await LNDX.rewardVested())["lastVestedAt"]).not.to.equal(0)
        expect((await LNDX.rewardVested())["vestingStartedAt"]).not.to.equal(0)
       
        expect(await LNDX.rewardSharesPerToken()).to.equal(0)
        expect(await LNDX.rewardNotDistributed()).to.equal(rewardsPerDay * 3)
    })

    it("Reward distribution second call after two days", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)

        time.increase(172800)
        await LNDX.grantLNDX(acc2.address, 100000000, 12, 36)
        
        expect((await LNDX.rewardVested())["amountVested"]).to.equal(rewardsPerDay * 2)
        expect((await LNDX.rewardVested())["daysClaimed"]).to.equal(2)
        expect((await LNDX.rewardVested())["lastVestedAt"]).not.to.equal(0)
        expect((await LNDX.rewardVested())["vestingStartedAt"]).not.to.equal(0)

        expect(await LNDX.rewardSharesPerToken()).to.equal(170958904)

        expect(await LNDX.balanceOf(LNDX.address)).to.equal(100000000 * 2 + rewardsPerDay * 2)
    })

    it("Impossible to mint rewards more then 15 600 000", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)

        time.increase(157766500) // more then 5 years
        await LNDX.grantLNDX(acc2.address, 100000000, 12, 36)
        
        expect((await LNDX.rewardVested())["amountVested"]).to.equal(15600000000000)
        expect((await LNDX.rewardVested())["daysClaimed"]).to.equal(1825)
        expect((await LNDX.rewardVested())["lastVestedAt"]).not.to.equal(0)
        expect((await LNDX.rewardVested())["vestingStartedAt"]).not.to.equal(0)

        expect(await LNDX.rewardSharesPerToken()).to.equal(156000000000)

        expect(await LNDX.balanceOf(LNDX.address)).to.equal(100000000 * 2  + 15600000000000)
    })

    it("Impossible to mint rewards when all rewards already minted", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)

        time.increase(157766500) // more then 5 years
        await LNDX.grantLNDX(acc2.address, 100000000, 12, 36)

        time.increase(259200) // add 3 days

        await LNDX.grantLNDX(acc3.address, 100000000, 12, 36)
        
        expect((await LNDX.rewardVested())["amountVested"]).to.equal(15600000000000)
        expect((await LNDX.rewardVested())["daysClaimed"]).to.equal(1825)
        expect((await LNDX.rewardVested())["lastVestedAt"]).not.to.equal(0)
        expect((await LNDX.rewardVested())["vestingStartedAt"]).not.to.equal(0)

        expect(await LNDX.rewardSharesPerToken()).to.equal(156000000000)

        expect(await LNDX.balanceOf(LNDX.address)).to.equal(100000000 * 3  + 15600000000000)
    })

    it("impossible claim when cliff is not over", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(100000000)

        time.increase(259200) // add 3 days
        await LNDX.grantLNDX(acc2.address, 100000000, 2, 1)
        expect(await veLNDX.balanceOf(acc2.address)).to.equal(25000000)

        time.increase(172800) // add 2 days (cliff is not over)

        await expect(LNDX.connect(acc2).claimVestedTokens()).to.be.revertedWith("wait one day or vested is 0")
    })

    it("Partial Claim grant", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(100000000)

        time.increase(259200) // add 3 days
        await LNDX.grantLNDX(acc2.address, 100000000, 2, 1)
        expect(await veLNDX.balanceOf(acc2.address)).to.equal(25000000)

        time.increase(5270400) // add 2 months and 1 day (cliff is over)

        await LNDX.connect(acc2).claimVestedTokens()
        
        expect((await LNDX.rewardVested())["amountVested"]).to.equal(rewardsPerDay * 64)
        expect((await LNDX.rewardVested())["daysClaimed"]).to.equal(64)
        expect((await LNDX.rewardVested())["lastVestedAt"]).not.to.equal(0)
        expect((await LNDX.rewardVested())["vestingStartedAt"]).not.to.equal(0)

        expect(await LNDX.balanceOf(acc2.address)).to.equal(3479497368)
        expect(await veLNDX.balanceOf(acc2.address)).to.equal(24166667)
    })

    it("Full Claim grant", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(100000000)

        time.increase(259200) // add 3 days
        await LNDX.grantLNDX(acc2.address, 100000000, 2, 1)
        expect(await veLNDX.balanceOf(acc2.address)).to.equal(25000000)

        time.increase(5270400) // add 2 months and 1 day (cliff is over)

        await LNDX.connect(acc2).claimVestedTokens()

        expect(await LNDX.balanceOf(acc2.address)).to.equal(3479497368)

        time.increase(2505600) // add 29 day, vesting is over

        await LNDX.connect(acc2).claimVestedTokens()
        
        expect((await LNDX.rewardVested())["amountVested"]).to.equal(rewardsPerDay * 93)
        expect((await LNDX.rewardVested())["daysClaimed"]).to.equal(93)
        expect((await LNDX.rewardVested())["lastVestedAt"]).not.to.equal(0)
        expect((await LNDX.rewardVested())["vestingStartedAt"]).not.to.equal(0)

        expect(await LNDX.balanceOf(acc2.address)).to.equal(152632058987)
        expect((await LNDX.grants(acc2.address))["totalClaimed"]).to.equal(100000000)
        expect(await veLNDX.balanceOf(acc2.address)).to.equal(0)
    })

    it("Try to claim totally claimed grant", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 12, 36)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(100000000)

        time.increase(259200) // add 3 days
        await LNDX.grantLNDX(acc2.address, 100000000, 2, 1)
        expect(await veLNDX.balanceOf(acc2.address)).to.equal(25000000)

        time.increase(5270400) // add 2 months and 1 day (cliff is over)
        await LNDX.connect(acc2).claimVestedTokens()
        expect(await LNDX.balanceOf(acc2.address)).to.equal(3479497368)

        time.increase(2505600) // add 29 day, vesting is over
        await LNDX.connect(acc2).claimVestedTokens()

        await expect(LNDX.connect(acc2).claimVestedTokens()).to.be.revertedWith("grant fully claimed")
    })

    it("stake, wrong period", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)

       await expect(LNDX.connect(acc1).stakeLNDX(10000000, 6)).to.be.reverted
    })

    it("stake", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)

       await LNDX.connect(acc1).stakeLNDX(10000000, 0)
       expect(await veLNDX.balanceOf(acc1.address)).to.equal(2500000)

       await LNDX.connect(acc1).stakeLNDX(10000000, 1)
       expect(await veLNDX.balanceOf(acc1.address)).to.equal(7500000)

       await LNDX.connect(acc1).stakeLNDX(10000000, 2)
       expect(await veLNDX.balanceOf(acc1.address)).to.equal(17500000)
    })

    it("Unstake impossible, stake period is not finished", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)
 
        await usdc.mint(feeDistributor.address, 10000000)
        await usdc.connect(feeDistributor).transfer(LNDX.address, 10000000)
        await LNDX.connect(feeDistributor).feeToDistribute(10000000)
 
        await LNDX.connect(acc1).stakeLNDX(10000000, 0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(2500000)
 
        time.increase(259200)
 
        await expect(LNDX.connect(acc1).unstake(1)).to.be.revertedWith("too early")
     })

     it("Unstake impossible, caller is not staker", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)
 
        await usdc.mint(feeDistributor.address, 10000000)
        await usdc.connect(feeDistributor).transfer(LNDX.address, 10000000)
        await LNDX.connect(feeDistributor).feeToDistribute(10000000)
 
        await LNDX.connect(acc1).stakeLNDX(10000000, 0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(2500000)
 
        await expect(LNDX.connect(acc2).unstake(1)).to.be.revertedWith("not staker")
     })

    it("Unstake", async function () {
       await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
       expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)

       await LNDX.connect(acc1).stakeLNDX(10000000, 0)
       expect(await veLNDX.balanceOf(acc1.address)).to.equal(2500000)

       await usdc.mint(feeDistributor.address, 10000000)
       await usdc.connect(feeDistributor).transfer(LNDX.address, 10000000)
       await LNDX.connect(feeDistributor).feeToDistribute(10000000)

       time.increase(259200)
       await LNDX.connect(acc1).stakeLNDX(10000000, 1)
       expect(await veLNDX.balanceOf(acc1.address)).to.equal(7500000)

       time.increase(259200)
       await LNDX.connect(acc1).stakeLNDX(10000000, 2)
       expect(await veLNDX.balanceOf(acc1.address)).to.equal(17500000)

       time.increase(7257600)
       await LNDX.connect(acc1).unstake(1)
       expect(await veLNDX.balanceOf(acc1.address)).to.equal(15000000)
       expect(await LNDX.balanceOf(acc1.address)).to.equal(114866692752)
       expect(await usdc.balanceOf(acc1.address)).to.equal(10000000)
    })

    it("Unstake", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)
 
        await LNDX.connect(acc1).stakeLNDX(10000000, 0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(2500000)
 
        time.increase(259200)
        await LNDX.connect(acc1).stakeLNDX(10000000, 1)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(7500000)

        await usdc.mint(feeDistributor.address, 10000000)
        await usdc.connect(feeDistributor).transfer(LNDX.address, 10000000)
        await LNDX.connect(feeDistributor).feeToDistribute(10000000)
 
        time.increase(259200)
        await LNDX.connect(acc1).stakeLNDX(10000000, 2)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(17500000)
 
        time.increase(7257600)
        await LNDX.connect(acc1).unstake(1)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(15000000)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(114866692752)
        expect(await usdc.balanceOf(acc1.address)).to.equal(3333332)
     })

     it("Unstake Preview", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)
 
        await LNDX.connect(acc1).stakeLNDX(10000000, 0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(2500000)
        expect((await LNDX.unstakePreview(1))[0]).to.equal(10000000)
        expect((await LNDX.unstakePreview(1))[1]).to.equal(0)
        expect((await LNDX.unstakePreview(1))[2]).to.equal(0)
       
        time.increase(259200)
        await LNDX.connect(acc1).stakeLNDX(10000000, 1)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(7500000)
        expect((await LNDX.unstakePreview(1))[0]).to.equal(10000000)
        expect((await LNDX.unstakePreview(1))[1]).to.equal(0)
        expect((await LNDX.unstakePreview(1))[2]).to.equal(8547945205)
        

        await usdc.mint(feeDistributor.address, 10000000)
        await usdc.connect(feeDistributor).transfer(LNDX.address, 10000000)
        await LNDX.connect(feeDistributor).feeToDistribute(10000000)
 
        time.increase(259200)
        await LNDX.connect(acc1).stakeLNDX(10000000, 2)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(17500000)
 
        time.increase(7257600)
        expect((await LNDX.unstakePreview(1))[0]).to.equal(10000000)
        expect((await LNDX.unstakePreview(1))[1]).to.equal(3333332)
        expect((await LNDX.unstakePreview(1))[2]).to.equal(114786692752)
     })

     it("Unstake Preview", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)
 
        await LNDX.connect(acc1).stakeLNDX(10000000, 0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(2500000)
 
        await usdc.mint(feeDistributor.address, 10000000)
        await usdc.connect(feeDistributor).transfer(LNDX.address, 10000000)
        await LNDX.connect(feeDistributor).feeToDistribute(10000000)
 
        time.increase(259200)
        await LNDX.connect(acc1).stakeLNDX(10000000, 1)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(7500000)
 
        time.increase(259200)
        await LNDX.connect(acc1).stakeLNDX(10000000, 2)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(17500000)
 
        time.increase(7257600)
        expect((await LNDX.unstakePreview(1))[0]).to.equal(10000000)
        expect((await LNDX.unstakePreview(1))[1]).to.equal(10000000)
        expect((await LNDX.unstakePreview(1))[2]).to.equal(114786692752)
     })

    it("Unstake impossible, already unstaked", async function () {
        await LNDX.grantLNDX(acc1.address, 100000000, 0, 0)
        expect(await LNDX.balanceOf(acc1.address)).to.equal(100000000)
 
        await LNDX.connect(acc1).stakeLNDX(10000000, 0)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(2500000)
 
        await usdc.mint(feeDistributor.address, 10000000)
        await usdc.connect(feeDistributor).transfer(LNDX.address, 10000000)
        await LNDX.connect(feeDistributor).feeToDistribute(10000000)
 
        time.increase(259200)
        await LNDX.connect(acc1).stakeLNDX(10000000, 1)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(7500000)
 
        time.increase(259200)
        await LNDX.connect(acc1).stakeLNDX(10000000, 2)
        expect(await veLNDX.balanceOf(acc1.address)).to.equal(17500000)
 
        time.increase(7257600)
        await LNDX.connect(acc1).unstake(1)

        await expect(LNDX.connect(acc1).unstake(1)).to.be.revertedWith("already unstaked")
     })

     it("Unable to distribute fee, caller has no role granted", async function () {
        await usdc.mint(feeDistributor.address, 10000000)
        await usdc.connect(feeDistributor).transfer(LNDX.address, 10000000)
        await expect(LNDX.connect(acc1).feeToDistribute(10000000)).to.be.reverted
     })

     it("owner can't renounceOwnership", async function () {
        await expect(LNDX.connect(owner).renounceOwnership()).to.be.revertedWith("can 't renounceOwnership here")
	})

    it("get decimals  works", async function () {
        expect(await LNDX.decimals()).to.equal(6)
	})
})