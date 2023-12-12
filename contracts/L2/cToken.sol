// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../interfaces/IcToken.sol";

contract CToken is IcToken, Context, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string public crop;

    constructor(string memory _crop)
        ERC20("LandX cToken", string(abi.encodePacked('c', _crop)))
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        crop = _crop;
    }

    // only minter can mint cTokens, for example xToken contract and L2 minter
    function mint(address account, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(account, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

}
