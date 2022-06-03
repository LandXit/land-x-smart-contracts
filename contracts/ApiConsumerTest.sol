// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";


interface IAPICONSUMER is IERC165 {
    function requestVolumeData() external;
    function volume() external view returns (uint256);
}

contract ApiConsumerTest is 
    Context,
    AccessControlEnumerable
{
    IAPICONSUMER public apiConsumer;

    uint256 public val;

    
    function test() public {
        apiConsumer.requestVolumeData();
        val = apiConsumer.volume();
    }

    function setApiConsumer(address _api) public {
        apiConsumer = IAPICONSUMER(_api);
    }
}