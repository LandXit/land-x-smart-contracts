// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IveLNDX {
    function mint(address account, uint256 amount) external;
    function burn(address account, uint256 amount) external;
}

contract LNDX is ERC20, Ownable {
    using SafeMath for uint256;
	using SafeMath for uint16;

    uint256 public constant MAX_MINTABLE_AMOUNT = 80000000000000;
    uint256 public constant MAX_REWARD_AMOUNT = 15600000000000;
    uint256 public totalRewardMinted = 0;

    address usdc;
    address veLNDX;

    enum StakePeriods {MONTHS_3, MONTHS_12, MONTHS_48}

    mapping (StakePeriods => uint8) public coefficients;
    mapping (StakePeriods => uint16) public aprs;

    struct Grant {
        uint256 createdTime;
		uint256 startTime;
		uint256 amount;
		uint16 vestingDuration;
		uint16 daysClaimed;
		uint256 totalClaimed;
		address recipient;
        uint256 veLndxClaimed;
        uint16 apr;
	}

    struct Stake {
        address staker;
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        uint256 veLndxClaimed;
        uint16 apr;
        bool unstaked;
    }

    mapping(uint256 => Stake) public stakes;
    uint256 public stakesCount = 0;

    mapping(address => Grant) public grants;

    event GrantAdded(address recipient, uint256 amount);
    event GrantTokensClaimed(address recipient, uint256 amountClaimed);

    event Staked(address user, uint256 amount, uint256 stakeId);
    event Unstaked(address user, uint256 amount, uint256 stakeId);

    mapping(address => uint256) feeShares;
    mapping(address => uint256) stakedBalance;

    uint256 public feeSharesPerToken;
    
    uint256 public totalStaked;
    uint256 public totalLocked;


    constructor(address _usdc, address _veLNDX) ERC20("LandX Governance Token", "LNDX") {
       usdc = _usdc;
       veLNDX = _veLNDX;
       coefficients[StakePeriods.MONTHS_3] = 25;
       coefficients[StakePeriods.MONTHS_12] = 50;
       coefficients[StakePeriods.MONTHS_48] = 100;

       aprs[StakePeriods.MONTHS_3] = 400; //4%
       aprs[StakePeriods.MONTHS_12] = 800; //8%
       aprs[StakePeriods.MONTHS_48] = 1600; //16%
    }

    function updateAPR(uint16 _month3, uint16 _month12, uint16 _month48) external onlyOwner {
        require(_month3 <= 5000, "Too high APR");
        require(_month12 <= 5000, "Too high APR");
        require(_month48 <= 5000, "Too high APR");

        aprs[StakePeriods.MONTHS_3] = _month3; 
        aprs[StakePeriods.MONTHS_12] = _month12;
        aprs[StakePeriods.MONTHS_48] = _month48;
    }

    /**
        LNDX Vesting logic
    */
    function grantLNDX(address recipient, uint256 amount, uint16 cliffInMonths, uint16 vestingDurationInMonths) external onlyOwner {
        require(grants[recipient].amount == 0, "grant already exists");
        require(totalSupply() + amount <= MAX_MINTABLE_AMOUNT, "Mint limit amount exceeded");
        if (cliffInMonths == 0 && vestingDurationInMonths == 0) {
            _mint(recipient, amount);
            return;
        }
        require(cliffInMonths <= 60, "cliff greater than one year");
		require(vestingDurationInMonths <= 60, "duration greater than 5 years");
        uint128 totalPeriod = cliffInMonths + vestingDurationInMonths;

        uint8 coefficient = coefficients[StakePeriods.MONTHS_3];
        uint16 apr = aprs[StakePeriods.MONTHS_3];
        if (totalPeriod >= 12 && totalPeriod < 48) {
            coefficient = coefficients[StakePeriods.MONTHS_12];
            apr = aprs[StakePeriods.MONTHS_12];
        }

        if (totalPeriod >= 48) {
            coefficient = coefficients[StakePeriods.MONTHS_48];
            apr = aprs[StakePeriods.MONTHS_48];
        }

        _mint(address(this), amount);
        stakedBalance[recipient] = stakedBalance[recipient] + amount;
       
        totalLocked = totalLocked + amount;
        uint256 veLNDXAmount = amount * coefficient / 100;
        IveLNDX(veLNDX).mint(recipient, veLNDXAmount);
        feeShares[recipient] = feeShares[recipient] + feeSharesPerToken * veLNDXAmount;

        uint256 startTime = block.timestamp + (30 days * uint256(cliffInMonths));

        Grant memory grant = Grant({
            createdTime: block.timestamp,
			startTime: startTime,
			amount: amount,
			vestingDuration: vestingDurationInMonths * 30,
			daysClaimed: 0,
			totalClaimed: 0,
			recipient: recipient,
            veLndxClaimed: veLNDXAmount,
            apr: apr 
		});

        grants[recipient] = grant;
        emit GrantAdded(recipient, amount);
    }

    function claimVestedTokens() external {
		uint16 daysVested;
		uint256 amountVested;
		(daysVested, amountVested) = calculateGrantClaim(msg.sender);
		require(amountVested > 0, "wait one day or vested is 0");

		Grant storage grant = grants[msg.sender];
		grant.daysClaimed = uint16(grant.daysClaimed.add(daysVested));
		grant.totalClaimed = uint256(grant.totalClaimed.add(amountVested));

        uint256 rewardsForDays = block.timestamp.sub(grant.createdTime - 1 days).div(1 days);
        uint256 rewards = mintReward(amountVested, rewardsForDays, grant.apr);

        uint256 veLNDXAmount = amountVested * grant.veLndxClaimed / grant.amount;
        IveLNDX(veLNDX).burn(msg.sender, veLNDXAmount);
        stakedBalance[msg.sender] = stakedBalance[msg.sender] - amountVested;
        totalLocked = totalLocked - amountVested;
        feeShares[msg.sender] = feeShares[msg.sender] - feeSharesPerToken * veLNDXAmount;
		require(transfer(grant.recipient, amountVested + rewards), "no tokens");
		emit GrantTokensClaimed(grant.recipient, amountVested);
	}

    function calculateGrantClaim(address _recipient) private view returns (uint16, uint256) {
		Grant storage grant = grants[_recipient];

		require(grant.totalClaimed < grant.amount, "grant fully claimed");

		// For grants created with a future start date, that hasn't been reached, return 0, 0
		if (block.timestamp < grant.startTime) {
			return (0, 0);
		}

		// Check cliff was reached
		uint256 elapsedDays = block.timestamp.sub(grant.startTime - 1 days).div(1 days);

		// If over vesting duration, all tokens vested
		if (elapsedDays >= grant.vestingDuration) {
			uint256 remainingGrant = grant.amount.sub(grant.totalClaimed);
			return (grant.vestingDuration, remainingGrant);
		} else {
			uint16 daysVested = uint16(elapsedDays.sub(grant.daysClaimed));
			uint256 amountVestedPerDay = grant.amount.div(uint256(grant.vestingDuration));
			uint256 amountVested = uint256(daysVested.mul(amountVestedPerDay));
			return (daysVested, amountVested);
		}
	}

    function getGrantStartTime(address _recipient) public view returns (uint256) {
		Grant storage grant = grants[_recipient];
		return grant.startTime;
	}

	function getGrantAmount(address _recipient) public view returns (uint256) {
		Grant storage grant = grants[_recipient];
		return grant.amount;
	}

    function calculateReward(uint256 amount, uint256 daysCount, uint16 apr) internal view returns (uint256) {
         if (totalRewardMinted >= MAX_REWARD_AMOUNT) {
            return 0;
        }

        uint256 rewards = amount * apr * daysCount / 10000 / 365;
        if (totalRewardMinted + rewards > MAX_REWARD_AMOUNT) {
            rewards = MAX_REWARD_AMOUNT - totalRewardMinted;
        }
        return rewards;
    }

    function mintReward(uint256 amount, uint256 daysCount, uint16 apr) internal returns (uint256) {
        uint256 rewards = calculateReward(amount, daysCount, apr);
        _mint(address(this), rewards);
        return rewards;
    }

    /**
    Staking logic
    */
    function feeToDistribute(uint256 amount) external {
        uint256 tokensCount = IERC20(veLNDX).totalSupply();
        if (tokensCount == 0) tokensCount = 1;
        feeSharesPerToken = feeSharesPerToken + amount / tokensCount;
    }

    function stakeLNDX(uint256 amount, StakePeriods period) external {
        require(coefficients[period] != 0, "wrong period");
        transferFrom(msg.sender, address(this), amount);
        uint256 mintAmount = amount * coefficients[period] / 100; //veLNDX amount to mint
        IveLNDX(veLNDX).mint(msg.sender, mintAmount);

        Stake memory stake = Stake({
            staker: msg.sender,
            amount: amount,
            startTime: block.timestamp,
            endTime: calculateEndDate(period),
            unstaked: false,
            veLndxClaimed: mintAmount,
            apr: aprs[period]
        });

        stakesCount++;
        stakes[stakesCount] = stake;

        uint256 veTokensCount = IERC20(veLNDX).totalSupply();
        if (veTokensCount == 0) veTokensCount = 1;
        
        stakedBalance[msg.sender] += amount;

        feeShares[msg.sender] += feeSharesPerToken * mintAmount;
        emit Staked(msg.sender, amount, stakesCount);
    }

    function unstake(uint256 stakeID) external {
        require(
           stakes[stakeID].staker == msg.sender,
            "not staker"
        );
        require(
           stakes[stakeID].unstaked == false,
            "already unstaked"
        );
        require(
           stakes[stakeID].endTime >= block.timestamp,
            "too early"
        );

        Stake storage s  = stakes[stakeID];
        totalStaked -= s.amount;
        stakedBalance[msg.sender] -= s.amount;

        uint256 feeShare = calculateFeeShare(msg.sender);
        feeShares[msg.sender] = 0;

        IveLNDX(veLNDX).burn(msg.sender, s.veLndxClaimed);

        uint256 rewardsForDays = s.endTime.sub(s.startTime - 1 days).div(1 days);
        uint256 rewards = mintReward(s.amount, rewardsForDays, s.apr);
        
        transfer(msg.sender, s.amount + rewards);
        IERC20(usdc).transfer(msg.sender, feeShare);
        emit Unstaked(msg.sender, s.amount, stakeID);
    }

    function unstakePreview(uint256 stakeID) external view returns (uint256, uint256, uint256){
        require(
           stakes[stakeID].staker == msg.sender,
            "not staker"
        );
        require(
           stakes[stakeID].unstaked == false,
            "already unstaked"
        );
        require(
           stakes[stakeID].endTime >= block.timestamp,
            "too early"
        );

        Stake storage s  = stakes[stakeID];
        
        uint256 feeShare = calculateFeeShare(msg.sender);
       
        uint256 rewardsForDays = s.endTime.sub(s.startTime - 1 days).div(1 days);
        uint256 rewards = calculateReward(s.amount, rewardsForDays, s.apr);
        
      return (s.amount, feeShare, rewards);
    }

    function calculateFeeShare(address _account) internal view returns (uint256) {
        uint256 veTokensCount = IERC20(veLNDX).balanceOf(_account);
        return veTokensCount * feeSharesPerToken - feeShares[_account];
    }

    function calculateEndDate(StakePeriods period) internal view returns (uint256) {
        if (period == StakePeriods.MONTHS_3) {
            return (block.timestamp + 90 days);
        }
        if (period == StakePeriods.MONTHS_12) {
            return (block.timestamp + 365 days);
        }
        if (period == StakePeriods.MONTHS_48) {
            return (block.timestamp + 4 * 365 days);
        }
        return 0;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
