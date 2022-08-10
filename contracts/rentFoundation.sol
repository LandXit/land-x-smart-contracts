// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

interface ILANDXNFT{
    function landArea(uint256 id) external view returns (uint256);

    function rent(uint256 id) external view returns (uint256);

    function crop(uint256 id) external view returns (string memory);
}

interface IXTOKENROUTER{
        function getXToken(string memory _name) external view returns(address);
        function getCToken(string memory _name) external view returns(address);
    } 

interface IGRAINPRICES {
	    function prices(string memory grain) external pure returns(uint256);
    }

interface ICrop {
        function crop() external pure returns(string memory);
    }

contract RentFoundation is 
    Context,
    Ownable
{
    IERC20 public usdc;

    ILANDXNFT public landXNFT; //address of landXNFT

    IGRAINPRICES public grainPrices;
    
    IXTOKENROUTER public xTokenRouter; // address of xTokenRouter

    event rentPaid(uint256 tokenID, uint256 amount);
    event initialRentPaid(uint256 tokenID, uint256 amount);

    struct deposit {
        uint256 timestamp;
        uint256 amount; // in kg
        int256 depositBalance; //in kg
    }

    mapping (uint256 => deposit) public deposits;

    mapping(uint256 => bool) public initialRentApplied;

    constructor(address _usdc)
    {
		usdc = IERC20(_usdc);
	}

    // deposit rent for token ID, in USDC
    function payRent(uint256 tokenID, uint256 amount) public {
        require(initialRentApplied[tokenID], "Initial rent was not applied");
        require(usdc.transferFrom(msg.sender, address(this), amount), "transfer failed");
        uint256 grainAmount = amount / grainPrices.prices(landXNFT.crop(tokenID));
        deposits[tokenID].amount += grainAmount;
        emit rentPaid(tokenID, grainAmount);
    }

    // prepay initial rent after sharding in kg
   function payInitialRent(uint256 tokenID, uint256 amount) external {
        string memory crop = ICrop(msg.sender).crop();
        require(!initialRentApplied[tokenID], "Initial Paymant already applied");
        require(xTokenRouter.getXToken(crop) == msg.sender, "not initial payer");
        deposits[tokenID].timestamp = block.timestamp;
        deposits[tokenID].amount = amount;
        initialRentApplied[tokenID] = true;
        emit initialRentPaid(tokenID, amount);
    }

    function getDepositBalance(uint256 tokenID) public view returns(int256) {
        uint256 elapsedSeconds = block.timestamp - deposits[tokenID].timestamp;
        uint256 delimeter = 365 * 1 days;
        uint256 rentPerSecond = landXNFT.rent(tokenID) * landXNFT.landArea(tokenID) / (10000 * delimeter);
        return int256(deposits[tokenID].amount) - int256(rentPerSecond * elapsedSeconds);
    }
    
    function sellCToken(address account, uint256 amount) public {
        string memory crop = ICrop(msg.sender).crop();
        require(xTokenRouter.getCToken(crop) == msg.sender, "no valid cToken");
        usdc.transfer(account, amount * grainPrices.prices(crop) / (10 ** 6));
    }

    function setXTokenRouter(address _router) public onlyOwner {
        xTokenRouter = IXTOKENROUTER(_router);
    }

    function setGrainPrices(address _grainPrices) public onlyOwner {
        grainPrices = IGRAINPRICES(_grainPrices);
    }
    
    // change the address of landxNFT.
    function changeLandXNFTAddress(address _newAddress) public onlyOwner {
        landXNFT = ILANDXNFT(_newAddress);
    }
    
    //owner can withdraw any token sent here. should be used with care
	function reclaimToken(IERC20 token, uint256 _amount) external onlyOwner {
		require(address(token) != address(0), "no 0 address");
		uint256 balance = token.balanceOf(address(this));
		require(_amount <= balance, "you can't withdraw more than you have");
		token.transfer(msg.sender, _amount);
	}

    //owner can withdraw any ETH sent here
	function withdraw() external onlyOwner {
		uint256 balance = address(this).balance;
		payable(msg.sender).transfer(balance);
	}
}