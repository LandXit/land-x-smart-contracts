// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/* Deployed To: 0xF9620e0425d13F7dD1b01D919F37Bc05739Fd74c */
contract Migration is Ownable {
    address public usdc = 0x4FEB71333c2A9fE81625a5727ab0Ed33dC77B841;
    address public usdcNew = 0x78d581B48275DD87179D578c42F246B7263fA6da;

    function migrate() public {
        uint usdcBalance = IERC20(usdc).balanceOf(msg.sender);
        IERC20(usdc).transferFrom(msg.sender, address(this), usdcBalance);
        IERC20(usdcNew).transfer(msg.sender, usdcBalance);
    }

    function updateUSDC(address _usdcNew) public onlyOwner {
        usdcNew = _usdcNew;
    }

    function reclaimToken(IERC20 token) public onlyOwner {
        require(address(token) != address(0));
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
    }
}