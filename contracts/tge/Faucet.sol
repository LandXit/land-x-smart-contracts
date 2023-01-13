// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/* Deployed To: 0xD99c47264E8AE8e4Ec9DFBAB35C6557b727d7A76 */
contract Faucet is Ownable {
    address usdc = 0xCd869cbCA8E597a10b6e1AEbF12aBFD693e542f2;
    uint usdcAmount = 2000 * 1e6; // 2000 USDC
    uint ethAmount = 5000000000000000; // 0.005 ETH
    address signer = 0x6b92A166372f74A6877771B16ab92078631A5a5c;

    mapping(address => bool) public claimed;

    function send(address _to) public {
        require(msg.sender == signer, "only signer can call this");
        require(claimed[msg.sender] == false, "you have claimed already");
        claimed[msg.sender] = true;
        IERC20(usdc).transfer(_to, usdcAmount);
        payable(_to).transfer(ethAmount);
    }

    function reclaimFunds() public onlyOwner {
        uint balance = IERC20(usdc).balanceOf(address(this));
        IERC20(usdc).transfer(msg.sender, balance);
        payable(msg.sender).transfer(address(this).balance);
    }

    function updateAmounts(uint _usdcAmount, uint _ethAmount) public onlyOwner {
        usdcAmount = _usdcAmount;
        ethAmount = _ethAmount;
    }

    function setSigner(address _signer) public onlyOwner {
        signer = _signer;
    }

    receive() external payable {}
    fallback() external payable {}
}