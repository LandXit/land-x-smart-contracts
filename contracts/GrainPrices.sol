// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";


contract GrainPrices is 
    Context,
    AccessControlEnumerable
{
    bytes32 public constant PRICE_SETTER_ROLE = keccak256("PRICE_SETTER_ROLE");

    uint256 public WheatPrice = 27;
	uint256 public RicePrice = 70;
	uint256 public MaizePrice = 29;
	uint256 public SoyPrice = 56;

    uint256 public USD_WTC_Rate = 500000000000000000; // for now it hardcoded

    constructor(address _address)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _address);
	}

    function setGrainPrices(uint256 wheatPrice, uint256 ricePrice, uint256 maizePrice, uint256 soyPrice) public {
        require(hasRole(PRICE_SETTER_ROLE, msg.sender), "not price setter");
        require(wheatPrice > 0 && ricePrice > 0 && maizePrice > 0 && soyPrice > 0, "Invalid values");
        WheatPrice = wheatPrice;
        RicePrice = ricePrice;
        MaizePrice = maizePrice;
        SoyPrice = soyPrice;
    }

    function setUSDWTCRate(uint256 rate) public {
        require(hasRole(PRICE_SETTER_ROLE, msg.sender), "not price setter");
        require(rate > 0, "Invalid values");
        USD_WTC_Rate = rate;
    }
}