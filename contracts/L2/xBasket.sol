// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";


contract xBasket is ERC20, AccessControl, ERC20Burnable, ERC20Permit {
   bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(
    ) ERC20Permit("xBasket") ERC20("xBasket LandX Index Fund", "xBasket") {
         _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

     // only minter can mint xBasket, for example  L2 bridge
    function mint(address account, uint256 amount) public onlyRole(MINTER_ROLE){
        _mint(account, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
