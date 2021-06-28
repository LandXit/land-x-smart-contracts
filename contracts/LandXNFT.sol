// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LandXNFT is ERC1155, Ownable {
	string public _baseURI = "https://api.xxxxx.com/v1/collection/item/metadata/";

	constructor() ERC1155(_baseURI) {}

	function setBaseURI(string memory newuri) public onlyOwner {
		_baseURI = newuri;
	}
}
