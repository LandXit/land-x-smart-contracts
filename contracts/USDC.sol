// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract USDC is
	Context,
	ERC20,
	AccessControlEnumerable,
	ERC20Permit,
	ERC20Burnable,
	ERC20Pausable,
	ERC20Snapshot,
	Ownable
{
	bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
	bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");
	mapping(address => bool) public blacklist; //keep track of blacklist

	constructor(address _address) ERC20Permit("USDC") ERC20("USD Coin", "USDC") {
		_setupRole(DEFAULT_ADMIN_ROLE, _address);
		_setupRole(MINTER_ROLE, _address);
		_setupRole(BLACKLISTER_ROLE, _address);
	}

	function decimals() public pure override returns (uint8) {
        return 6;
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
