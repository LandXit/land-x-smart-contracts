// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
contract LandXNFT is ERC1155, Ownable {
    using Strings for string;

    //detailsSetter can set details of an NFT
    address public detailsSetter;

    // other parameters
    string private _baseTokenURI =
        "http://dev-landx-nfts.s3-website-us-east-1.amazonaws.com/j/";
    string private _contractURI =
        "https://raw.githubusercontent.com/AndreiD/Playground/master/nfts_sample/contract_uri";

    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => uint256) public landArea; // in square-meters
    mapping(uint256 => uint256) public rent; //rentInKgOfWheatPerYear
    mapping(uint256 => address) public shardManager;
    mapping(uint256 => address) public landOwner;

    //1 shard = (landArea * rent) /  10000

    constructor() ERC1155(_baseTokenURI) {
        detailsSetter = msg.sender;
    }

    /**@dev sets the token details. price is in *wei* */
    function setDetailsAndMint(
        uint256 _index,
        uint256 _landArea,
        uint256 _rent,
        address _landOwner,
        address _shardManager,
        address _to
    ) public {
        require(msg.sender == detailsSetter, "not detailsSetter");
        require(totalSupply[_index] == 0, "tokenID already minted");
        require(_shardManager != address(0), "shardManager is not defined");
        landArea[_index] = _landArea;
        rent[_index] = _rent;
        shardManager[_index] = _shardManager;
        landOwner[_index] = _landOwner;
        totalSupply[_index] = totalSupply[_index] + 1;
        _mint(_to, _index, 1, "0x0000");
    }

    //burns one token
    function burn(
        address account,
        uint256 id,
        uint256 value
    ) public virtual {
        require(
            account == _msgSender() || isApprovedForAll(account, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );
        _burn(account, id, value);
        totalSupply[id] = totalSupply[id] - 1;
    }

    function setBaseURI(string memory newuri) public onlyOwner {
        _baseTokenURI = newuri;
    }

    function setContractURI(string memory newuri) public onlyOwner {
        _contractURI = newuri;
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseTokenURI, uint2str(tokenId)));
    }

    // sets the setDetailsSetter address.
    function setDetailsSetter(address _newDetailsSetter) public onlyOwner {
        detailsSetter = _newDetailsSetter;
    }

    //**
    // ------------ OTHER NON IMPORTANT THINGS ------------
    //**

    function uint2str(uint256 _i)
        internal
        pure
        returns (string memory _uintAsString)
    {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
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

    //TODO: needed ?
    //1 = 0.01%, 300 = 3%,...
    function _calcPercentage(uint256 amount, uint256 basisPoints)
        internal
        pure
        returns (uint256)
    {
        require(basisPoints >= 0);
        return (amount * basisPoints) / 10000;
    }
}
