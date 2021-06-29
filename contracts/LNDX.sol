// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract LNDX is ERC20Permit, ERC20Burnable, Ownable {
	constructor() ERC20Permit("LNDX") ERC20("LNDX", "LNDX") {
		_mint(msg.sender, 9999999999 * (10**uint256(18))); //TODO: max supply?
	}

	// Withdraw currency accidentally sent to the smart contract (eth)
	function withdraw() public onlyOwner {
		uint256 balance = address(this).balance;
		payable(msg.sender).transfer(balance);
	}

	// Withdraw currency accidentally sent to the smart contract (tokens)
	function reclaimToken(IERC20 token) public onlyOwner {
		require(address(token) != address(0));
		uint256 balance = token.balanceOf(address(this));
		token.transfer(msg.sender, balance);
	}
}
