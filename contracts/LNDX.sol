// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

contract LNDX is
    Context,
    AccessControlEnumerable,
    ERC20Permit,
    ERC20Burnable,
    Ownable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20Permit("LNDX") ERC20("LNDX", "LNDX") {
        _setupRole(MINTER_ROLE, _msgSender());
        _mint(msg.sender, 60000000 * (10**uint256(18))); //60 million
    }

    //caller must have MINTER_ROLE
    function mint(address to, uint256 amount) public virtual {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "ERC20PresetMinterPauser: must have minter role to mint"
        );
        _mint(to, amount);
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
