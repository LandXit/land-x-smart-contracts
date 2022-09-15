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
    function getXToken(string memory _name) external view returns(address);
}

contract CToken is
    Context,
    ERC20Burnable,
    Ownable
{
    IRENTFOUNDATION public rentFoundation; 
    IXTOKENROUTER public xTokenRouter; // address of xTokenRouter
    string public constant crop = "CORN";

    constructor(address _rentForndation, address _xTokenRouter)
        ERC20("LandX cToken", "cCORN")
    {
        rentFoundation = IRENTFOUNDATION(_rentForndation);
        xTokenRouter = IXTOKENROUTER(_xTokenRouter);
    }

    // only minter can mint cTokens, for example xToken contract
    function mint(address account, uint256 amount) public {
        require(msg.sender == xTokenRouter.getXToken(crop), "action is not allowed");
        _mint(account, amount);
    }

    function burn(uint256 amount) public override {
        rentFoundation.sellCToken(msg.sender, amount);
        _burn(msg.sender, amount);
    }

    // reclaim accidentally sent eth
    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }


    // reclaim accidentally sent tokens
    function reclaimToken(IERC20 token) public onlyOwner {
        require(address(token) != address(0));
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
    }

    function setRentFoundation(address _address) public onlyOwner {
        rentFoundation = IRENTFOUNDATION(_address);
    }

    function setXTokenRouter(address _router) public onlyOwner {
        xTokenRouter = IXTOKENROUTER(_router);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
	}
}