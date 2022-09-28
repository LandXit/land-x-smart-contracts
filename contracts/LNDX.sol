// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract LNDX is ERC20 {

    address usdc;
    event Stake(address user, uint256 amount);
    event Unstake(address user, uint256 amount, uint256 feeShare);

    constructor() ERC20("LNDX LandX Governance Token", "LNDX") {
        _mint(msg.sender,1000000000 ether);
        if (block.chainid == 1) usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // Mainnet
        if (block.chainid == 4) usdc = 0xE3A2763c0437B622077761697BC22782d59DbE19; // Rinkeby
        if (block.chainid == 5) usdc = 0x4FEB71333c2A9fE81625a5727ab0Ed33dC77B841; // Goerli
        require(usdc != address(0), "What chain are we on again?");
    }

    uint256 public totalStaked = 1;
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakedShares;

    function stake(uint256 _amount) external {
        transferFrom(msg.sender, address(this), _amount);
        totalStaked += _amount;
        stakedBalance[msg.sender] += _amount;
        uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));
        if (usdcBalance == 0) usdcBalance = 1;
        uint256 shares = _amount * usdcBalance / totalStaked; // needs testing
        stakedShares[msg.sender] += shares;
        emit Stake(msg.sender, _amount);
    }

    function unstake(uint256 _amount) external {
        require(stakedBalance[msg.sender] >= _amount, "Not enough funds staked");
        totalStaked -= _amount;
        stakedBalance[msg.sender] -= _amount;
        uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));
        if (usdcBalance == 0) usdcBalance = 1;
        uint256 feeShare = stakedShares[msg.sender] * totalStaked / usdcBalance; // needs testing
        transfer(msg.sender, _amount);
        IERC20(usdc).transfer(msg.sender,feeShare);
        emit Unstake(msg.sender, _amount, feeShare);
    }
}
