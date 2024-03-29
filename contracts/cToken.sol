// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./interfaces/IcToken.sol";
import "./interfaces/IxTokenRouter.sol";
import "./interfaces/IRentFoundation.sol";

contract CToken is IcToken, Context, ERC20Burnable, Ownable {
    IRentFoundation public rentFoundation;
    IxTokenRouter public xTokenRouter; // address of xTokenRouter
    string public crop;

    constructor(address _rentFoundation, address _xTokenRouter, string memory _crop)
        ERC20("LandX cToken", string(abi.encodePacked('c', _crop)))
    {
        require(_rentFoundation != address(0), "zero address is not allowed");
        require(_xTokenRouter != address(0), "zero address is not allowed");
        rentFoundation = IRentFoundation(_rentFoundation);
        xTokenRouter = IxTokenRouter(_xTokenRouter);
        crop = _crop;
    }

    // only minter can mint cTokens, for example xToken contract
    function mint(address account, uint256 amount) public {
        require(
            msg.sender == xTokenRouter.getXToken(crop),
            "action is not allowed"
        );
        _mint(account, amount);
    }

    function burn(uint256 amount) public override {
        rentFoundation.sellCToken(msg.sender, amount);
        _burn(msg.sender, amount);
    }

    function setRentFoundation(address _address) public onlyOwner {
        require(_address != address(0), "zero address is not allowed");
        rentFoundation = IRentFoundation(_address);
    }

    function setXTokenRouter(address _router) public onlyOwner {
        require(_router != address(0), "zero address is not allowed");
        xTokenRouter = IxTokenRouter(_router);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

     function renounceOwnership() public view override onlyOwner {
        revert ("can 't renounceOwnership here");
    }
}
