// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IXTOKENROUTER {
    function getXToken(string memory _name) external view returns (address);
}

contract LandXNFT is ERC1155, Ownable {
    using Strings for string;

    IXTOKENROUTER public xTokenRouter;

    // other parameters
    string private _baseTokenURI =
        "http://dev-landx-nfts.s3-website-us-east-1.amazonaws.com/j/";

    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => uint256) public landArea; // total area in square-meters
    mapping(uint256 => uint256) public tillableArea; // tillable area in square-meters
    mapping(uint256 => uint256) public cropShare; //crop share
    mapping(uint256 => string) public crop; // ["SOY", "RICE" ....]
    mapping(uint256 => address) public validator; // validator or landowner
    mapping(uint256 => bytes32) public lienAgreementHash; //sha256 hash of lien documents
    mapping(uint256 => address) public initialOwner;

    constructor(address _xTokenRouter, string memory _uri)
        ERC1155(_baseTokenURI)
    {
        xTokenRouter = IXTOKENROUTER(_xTokenRouter);
        _baseTokenURI = _uri;
    }

    /**@dev sets the token details. price is in *wei* */
    function setDetailsAndMint(
        uint256 _index,
        uint256 _landArea,
        uint256 _tillableArea,
        uint256 _cropShare,
        address _validator,
        bytes32 _lienAgreementHash,
        string memory _crop,
        address _to
    ) public onlyOwner {
        require(totalSupply[_index] == 0, "tokenID already minted");
        require(
            xTokenRouter.getXToken(_crop) != address(0),
            "xToken is not defined"
        );
        landArea[_index] = _landArea;
        tillableArea[_index] = _tillableArea;
        cropShare[_index] = _cropShare;
        crop[_index] = _crop;
        validator[_index] = _validator;
        lienAgreementHash[_index] = _lienAgreementHash;
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
        require(bytes(newuri).length > 0, "empty string");
        _baseTokenURI = newuri;
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseTokenURI, uint2str(tokenId)));
    }

    function setXTokenRouter(address _router) public onlyOwner {
        require(_router != address(0), "zero address is not allowed");
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
