// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC1155Mock is ERC1155, Ownable {
    constructor() ERC1155("") {
        mint(msg.sender, 0, 100, "");
        mint(msg.sender, 1, 1000, "");
        mint(msg.sender, 2, 10000, "");
        mint(msg.sender, 3, 10000, "");
        mint(msg.sender, 4, 10000, "");
        mint(msg.sender, 5, 10000, "");
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual onlyOwner {
        _mint(to, id, amount, data);
    }
}
