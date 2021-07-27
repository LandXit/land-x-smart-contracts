// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract WTC is
	Context,
	AccessControlEnumerable,
	ERC20Permit,
	ERC20Burnable,
	ERC20Pausable,
	ERC20Snapshot,
	Ownable
{
	//9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6 = MINTER_ROLE
	bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
	//98db8a220cd0f09badce9f22d0ba7e93edb3d404448cc3560d391ab096ad16e9 = BLACKLISTER_ROLE
	bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");

	mapping(address => bool) public blacklist; //keep track of blacklist

	constructor(address _address) ERC20Permit("WTC") ERC20("Wheat Coin", "WTC") {
		_setupRole(MINTER_ROLE, _address);
		_setupRole(BLACKLISTER_ROLE, _address);
	}

	function mint(address to, uint256 amount) public virtual {
		require(hasRole(MINTER_ROLE, _msgSender()), "not minter");
		_mint(to, amount);
	}

	function pause() public onlyOwner {
		_pause();
	}

	function unpause() public onlyOwner {
		_unpause();
	}

	function snapshot() public onlyOwner {
		_snapshot();
	}

	function setBlacklist(address user, bool value) public virtual {
		require(hasRole(BLACKLISTER_ROLE, _msgSender()), "not blacklister");
		blacklist[user] = value;
	}

	function _beforeTokenTransfer(
		address from,
		address to,
		uint256 amount
	) internal override(ERC20, ERC20Pausable, ERC20Snapshot) {
		require(!blacklist[to], "recipient is blacklisted");
		require(!blacklist[from], "sender is blacklisted");
		super._beforeTokenTransfer(from, to, amount);
	}

	function withdraw() public onlyOwner {
		uint256 balance = address(this).balance;
		payable(msg.sender).transfer(balance);
	}

	function reclaimToken(IERC20 token) public onlyOwner {
		require(address(token) != address(0));
		uint256 balance = token.balanceOf(address(this));
		token.transfer(msg.sender, balance);
	}
}
