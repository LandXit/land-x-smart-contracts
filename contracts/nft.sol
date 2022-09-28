// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IXTOKENROUTER {
    function getXToken(string memory _name) external view returns(address); 
}

interface IKEYPROTOKOLVALUES {
    function maxAllowableCropShare(string memory grain) external pure returns(uint256);
}

contract LandXNFT is ERC1155, Ownable {
    using Strings for string;

    IXTOKENROUTER public xTokenRouter;
    IKEYPROTOKOLVALUES public keyProtocolValues;

    // other parameters
    string private _baseTokenURI =
        "http://dev-landx-nfts.s3-website-us-east-1.amazonaws.com/j/";
    string private _contractURI =
        "https://raw.githubusercontent.com/AndreiD/Playground/master/nfts_sample/contract_uri";

    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => uint256) public landArea; // in square-meters
    mapping(uint256 => uint256) public rent; //rentInKgOfWheatPerYear
    mapping(uint256 => string)  public crop; // ["SOY", "RICE" ....]
    mapping(uint256 => address) public validator; // validator or landowner
    mapping(uint256 => address) public initialOwner;

    //1 shard = (landArea * rent) /  10000

    constructor(address _keyProtocolValues, address _xTokenRouter) ERC1155(_baseTokenURI) {
        keyProtocolValues = IKEYPROTOKOLVALUES(_keyProtocolValues);
        xTokenRouter = IXTOKENROUTER(_xTokenRouter);
    }

    /**@dev sets the token details. price is in *wei* */
    function setDetailsAndMint(
        uint256 _index, 
        uint256 _landArea,
        uint256 _yield,
        address _validator,
        string memory _crop,
        address _to
    ) public onlyOwner{
        require(totalSupply[_index] == 0, "tokenID already minted");
        require(xTokenRouter.getXToken(_crop) != address(0), "xToken is not defined");
        landArea[_index] = _landArea;
        rent[_index] = _yield * keyProtocolValues.maxAllowableCropShare(_crop) / 10000;
        crop[_index] = _crop;
        validator[_index] = _validator;
        totalSupply[_index] = totalSupply[_index] + 1;
        initialOwner[_index] = _to;
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

    function setXTokenRouter(address _router) public onlyOwner {
        xTokenRouter = IXTOKENROUTER(_router);
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
}
