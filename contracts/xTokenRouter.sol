// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

//Service Contract for getting xToken/xBasket/cToken Contract
//Before using should be initialized by contract owner

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract xTokenRouter is Ownable {
    
    struct Token {
        address xToken;
        address cToken;
    }
    mapping(string => Token) public tokens;

    //Add or update xToken/cToken address: tokens[SOY].xToken = '0x....'
    function setToken(string memory crop, address xToken, address cToken) public onlyOwner
    {
        tokens[crop].xToken = xToken;
        tokens[crop].cToken = cToken;
    }

    function getXToken(string memory crop) external view returns(address) 
    {
        return tokens[crop].xToken;
    }

    function getCToken(string memory crop) external view returns(address) 
    {
        return tokens[crop].cToken;
    }

    // reclaim accidentally sent eth
    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
    
    // reclaim accidentally sent tokens
    function reclaimToken(address token) public onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(msg.sender, balance);
    }
}