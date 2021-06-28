// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract LandXNFT is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(uint256 => uint256) public rentPerYear;

    constructor() ERC721("LandX NFT", "LDX") {
        _setBaseURI("ipfs://");
    }

    function mint(address to, uint256 rent) public returns (uint256) {
        _tokenIds.increment();

        uint256 newTokenId = _tokenIds.current();

        rentPerYear[newTokenId] = area;

        _safeMint(to, newTokenId);
        // _setTokenURI(newTokenId, tokenURI);

        return newTokenId;
    }
}
