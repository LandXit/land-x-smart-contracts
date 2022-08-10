// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IXToken {
    function xBasketTransfer(address _from, uint256 amount) external;
    function crop() external pure returns(string memory);
}

interface IXTOKENROUTER{
    function getCToken(string memory _name) external view returns(address);
}

interface ICTOKEN {
    function mint(address account, uint256 amount) external;
}

contract xBasket is ERC20, Ownable {
    address public xWheat; // 0xfEFb9F639327E39BECBDeFd7d76fFAFE8ed778F2
    address public xSoy; // 0x50E5867D42f876ED75628940684ad510e9f40a5B
    address public xCorn; // 0x192Ad77D703968026621e112D0c3576859340d69
    address public xRice; // 0xFB5E2A1884FE0496554e643A3760846BC3858384

    IXTOKENROUTER public xTokenRouter;

     struct Stake {
        uint256 amount;
        uint256 startTime;
    }

    mapping(address => Stake) public Staked;
    mapping(address => uint256) public Yield;
    
    constructor(address _xWheat, address _xSoy, address _xCorn, address _xRice, address _xTokenRouter) ERC20("xBasket LandX Index Fund", "xBASKET") {
        xWheat = _xWheat;
        xSoy = _xSoy;
        xCorn = _xCorn;
        xRice = _xRice;
        xTokenRouter = IXTOKENROUTER(_xTokenRouter);
    }

    // Deposit xTokens to mint xBasket
    function mint(uint256 amount) external {
        require(amount > 1e10, "Amount too low to mint");
        uint256 depositAmount = amount / 4;
        IXToken(xWheat).xBasketTransfer(msg.sender,depositAmount);
        IXToken(xSoy).xBasketTransfer(msg.sender,depositAmount);
        IXToken(xCorn).xBasketTransfer(msg.sender,depositAmount);
        IXToken(xRice).xBasketTransfer(msg.sender,depositAmount);
        _mint(msg.sender, amount);
    }

    // Burn xBasket to redeem xTokens
    function redeem(uint256 amount) external {
        require(amount > 1e10, "Amount too low to burn");
        uint256 redeemAmount = amount / 4;
        require(balanceOf(msg.sender) >= amount, "Your xBasket balance is too low");
        _burn(msg.sender,amount);
        IERC20(xWheat).transfer(msg.sender,redeemAmount);
        IERC20(xSoy).transfer(msg.sender,redeemAmount);
        IERC20(xCorn).transfer(msg.sender,redeemAmount);
        IERC20(xRice).transfer(msg.sender,redeemAmount);
    }

     function stake(uint256 amount) public {
        _transfer(msg.sender, address(this), amount);
        uint256 yield = calculateYield(Staked[msg.sender]);
        Yield[msg.sender] += yield;
        Staked[msg.sender].startTime = block.timestamp;
        Staked[msg.sender].amount = amount;
    }

    function unstake(uint256 amount) public {
        _transfer(address(this), msg.sender, amount);
        uint256 yield = calculateYield(Staked[msg.sender]);
        Yield[msg.sender] += yield;
        Staked[msg.sender].startTime = block.timestamp;
        Staked[msg.sender].amount -= amount;
    }

    function claim() public {
        uint256 yield = calculateYield(Staked[msg.sender]) + Yield[msg.sender];
        address cToken;

        cToken = xTokenRouter.getCToken("SOY");
        ICTOKEN(cToken).mint(msg.sender,  yield / 4);

        cToken = xTokenRouter.getCToken("RICE");
        ICTOKEN(cToken).mint(msg.sender,  yield / 4);

        cToken = xTokenRouter.getCToken("WHEAT");
        ICTOKEN(cToken).mint(msg.sender,  yield / 4);

        cToken = xTokenRouter.getCToken("CORN");
        ICTOKEN(cToken).mint(msg.sender,  yield / 4);

        Yield[msg.sender] = 0;
    }

    // calculate cTokanes amount generated since amount was staked
    function calculateYield(Stake storage s) view internal returns (uint256)
    {
        uint256 elapsedSeconds = block.timestamp - s.startTime;
        uint256 delimeter = 365 * 1 days;
        return (s.amount * elapsedSeconds) / delimeter; 
    }

    function updatexWheat(address _address) external onlyOwner {
        xWheat = _address;
    }
    function updatexSoy(address _address) external onlyOwner {
        xSoy = _address;
    }
    function updatexCorn(address _address) external onlyOwner {
        xCorn = _address;
    }
    function updatexRice(address _address) external onlyOwner {
        xRice = _address;
    }

     function setXTokenRouter(address _router) public onlyOwner {
        xTokenRouter = IXTOKENROUTER(_router);
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