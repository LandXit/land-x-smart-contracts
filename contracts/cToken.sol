// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

interface IRENTFOUNDATION {
    function sellCToken(address account, uint256 amount) external;
}

interface IXTOKENROUTER {
    function getXToken(string memory _name) external view returns (address);
}

contract CToken is Context, ERC20Burnable, Ownable {
    IRENTFOUNDATION public rentFoundation;
    IXTOKENROUTER public xTokenRouter; // address of xTokenRouter
    string public crop;

    constructor(address _rentForndation, address _xTokenRouter, string memory _crop)
        ERC20("LandX cToken", string(abi.encodePacked('c', _crop)))
    {
        require(_rentForndation != address(0), "zero address is not allowed");
        require(_xTokenRouter != address(0), "zero address is not allowed");
        rentFoundation = IRENTFOUNDATION(_rentForndation);
        xTokenRouter = IXTOKENROUTER(_xTokenRouter);
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
        rentFoundation = IRENTFOUNDATION(_address);
    }

    function setXTokenRouter(address _router) public onlyOwner {
        require(_router != address(0), "zero address is not allowed");
        xTokenRouter = IXTOKENROUTER(_router);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

     function renounceOwnership() public view override onlyOwner {
        revert ("can 't renounceOwnership here");
    }
}
