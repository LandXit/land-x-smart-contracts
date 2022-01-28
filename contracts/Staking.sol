// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

//Staking with admin superpower
contract Staking is Ownable, Pausable, ReentrancyGuard {
	using SafeMath for uint256;

	struct UserInfo {
		uint256 amount; // current staked WTC
		uint256 createdAt; // unix timestamp when the user created
		uint256 lastUpdateAt; // unix timestamp for last details update (when pointsDebt calculated)
		uint256 pointsDebt; // total points collected before latest deposit
	}

	uint256 public minimumAmount = 1000 * (10**18); //1000 WTC
	uint256 public maxAmount = 1000000 * (10**18); //1 mil WTC (per user)
	uint256 public maximumTotalAmount = 50000000 * (10**18); //50 mil WTC (total)
	uint256 public totalStakedAmount = 0; //counts how much users staked. (must be < maximumTotalAmount)
	uint256 public lockTime = 1 hours;

	//emissionRate - points generated per WTC token per second staked
	uint256 public emissionRate;

	IERC20 wtcToken; // token being staked

	mapping(address => UserInfo) public userInfo;

	event Staked(address user, uint256 amount);
	event PaidReward(address user, uint256 amount);
	event Unstaked(address, uint256 amount);
	event StakeClaimed(address user, uint256 amount);
	event RewardAdded(uint256 amount);
	event EmissionRateChanged(uint256 newEmissionRate);

	constructor(IERC20 _theToken, uint256 _emissionRate) {
		wtcToken = _theToken;
		emissionRate = _emissionRate;
	}

	// Add reward to the smart contract (must have approval)
	function addReward(uint256 _amount) external {
		wtcToken.transferFrom(msg.sender, address(this), _amount);
		emit RewardAdded(_amount);
	}

	//the core of the contract (must have approval)
	function stake(uint256 _amount) external whenNotPaused nonReentrant {
		require(_amount >= minimumAmount, "amount below minimumAmount");
		require(_amount <= maxAmount, "amount greater than maxAmount");
		require((totalStakedAmount + _amount) <= maximumTotalAmount, "this contract reached its max limit");
		require(wtcToken.transferFrom(msg.sender, address(this), _amount), "failed to transfer");

		// already deposited before
		UserInfo storage user = userInfo[msg.sender];
		if (user.amount != 0) {
			user.pointsDebt = pointsBalance(msg.sender);
		}

		user.amount = user.amount.add(_amount);
		user.lastUpdateAt = block.timestamp;
		user.createdAt = block.timestamp;

		totalStakedAmount = totalStakedAmount + _amount;
		emit Staked(msg.sender, _amount);
	}

	//get them rewards
	function claim() public nonReentrant {
		UserInfo storage user = userInfo[msg.sender];

		// deduct points
		uint256 amountToTransfer = pointsBalance(msg.sender);
		user.pointsDebt = 0;
		user.lastUpdateAt = block.timestamp;

		wtcToken.transfer(msg.sender, amountToTransfer);
		emit PaidReward(msg.sender, amountToTransfer);
	}

	function unstake() external {
		UserInfo storage user = userInfo[msg.sender];
		require(user.amount >= 0, "insufficient staked");
		require(user.createdAt + lockTime <= block.timestamp, "tokens are locked");

		// First, send all unclaimed rewards
		claim();

		uint256 userAmount = user.amount;
		user.amount = 0;

		wtcToken.transfer(msg.sender, userAmount);
		emit Unstaked(msg.sender, userAmount);
	}

	//forces a user to unstake (should be used with care)
	function forceUnstake(address userAddress) external onlyOwner {
		UserInfo storage user = userInfo[userAddress];
		// deduct points
		uint256 amountToTransfer = pointsBalance(userAddress);
		user.pointsDebt = 0;
		user.lastUpdateAt = block.timestamp;
		wtcToken.transfer(userAddress, amountToTransfer);
		uint256 userAmount = user.amount;
		user.amount = 0;
		wtcToken.transfer(userAddress, userAmount);
	}

	//calculates the undebitted points. (seconds since staked) X emission rate X amount / 10^18
	function _unDebitedPoints(UserInfo memory user) internal view returns (uint256) {
		return block.timestamp.sub(user.lastUpdateAt).mul(emissionRate).mul(user.amount).div(1e18);
	}

	//calculte how many points an address has
	function pointsBalance(address userAddress) public view returns (uint256) {
		UserInfo memory user = userInfo[userAddress];
		return user.pointsDebt.add(_unDebitedPoints(user));
	}

	//change how many WTC per second you gain (in wei)
	function changeEmissionRate(uint256 newEmissionRate) external onlyOwner {
		emissionRate = newEmissionRate;
		emit EmissionRateChanged(newEmissionRate);
	}

	//change the minimum amount that this staking accepts
	function changeMinAmount(uint256 amount) external onlyOwner {
		minimumAmount = amount;
	}

	//change the maximum amount that this staking accepts (per user)
	function changeMaxAmount(uint256 amount) external onlyOwner {
		maxAmount = amount;
	}

	//change the maximum amount that this staking accepts (globally)
	function changeMaxTotalAmount(uint256 amount) external onlyOwner {
		maximumTotalAmount = amount;
	}

	//change lock time of the tokens
	function changeLockTime(uint256 newTimeInSeconds) external onlyOwner {
		lockTime = newTimeInSeconds;
	}

	//owner can withdraw any token sent here. should be used with care
	function reclaimToken(IERC20 token, uint256 _amount) external onlyOwner {
		require(address(token) != address(0), "no 0 address");
		uint256 balance = token.balanceOf(address(this));
		require(_amount <= balance, "you can't withdraw more than you have");
		token.transfer(msg.sender, _amount);
	}

	//blocks staking but doesn't block unstaking / claiming
	function pause() external onlyOwner {
		_pause();
	}

	function unpause() external onlyOwner {
		_unpause();
	}

	//owner can withdraw any ETH sent here
	function withdraw() external onlyOwner {
		uint256 balance = address(this).balance;
		payable(msg.sender).transfer(balance);
	}
}
