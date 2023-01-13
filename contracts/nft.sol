// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IXTOKENROUTER {
    function getXToken(string memory _name) external view returns (address);
}

interface IKeyProtocolValues {
    function maxValidatorFee() external pure returns (uint256);
}

contract LandXNFT is ERC1155, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    IXTOKENROUTER public xTokenRouter;
    IKeyProtocolValues public keyProtocolValues;

    // other parameters
    string private _baseTokenURI =
        "http://dev-landx-nfts.s3-website-us-east-1.amazonaws.com/j/";

    mapping(uint256 => uint256) public totalSupply;
    mapping(uint256 => uint256) public landArea; // total area in square-meters
    mapping(uint256 => uint256) public tillableArea; // tillable area in square-meters
    mapping(uint256 => uint256) public cropShare; //crop share
    mapping(uint256 => string) public crop; // ["SOY", "RICE" ....]
    mapping(uint256 => address) public validator; // validator or landowner
    mapping(uint256 => uint256) public validatorFee;
    mapping(uint256 => bytes32) public lienAgreementHash; //sha256 hash of lien documents
    mapping(uint256 => address) public initialOwner;
    mapping(uint256 => string) public metadataUri;

    constructor(address _xTokenRouter, address _keyProtocolValues, string memory _uri)
        ERC1155(_baseTokenURI)
    {
        xTokenRouter = IXTOKENROUTER(_xTokenRouter);
        keyProtocolValues = IKeyProtocolValues(_keyProtocolValues);
        _baseTokenURI = _uri;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**@dev sets the token details. price is in *wei* */
    function setDetailsAndMint(
        uint256 _index,
        uint256 _landArea,
        uint256 _tillableArea,
        uint256 _cropShare,
        address _validator,
        uint256 _validatorFee,
        bytes32 _lienAgreementHash,
        string memory _crop,
        address _to,
        string memory _uri
    ) public onlyRole(MINTER_ROLE) {
        require(totalSupply[_index] == 0, "tokenID already minted");
        require(
            xTokenRouter.getXToken(_crop) != address(0),
            "xToken is not defined"
        );
        require(_validatorFee <= keyProtocolValues.maxValidatorFee(),"validator's fee to high");
        landArea[_index] = _landArea;
        tillableArea[_index] = _tillableArea;
        cropShare[_index] = _cropShare;
        crop[_index] = _crop;
        validator[_index] = _validator;
        lienAgreementHash[_index] = _lienAgreementHash;
        totalSupply[_index] = totalSupply[_index] + 1;
        initialOwner[_index] = _to;
        validatorFee[_index] = _validatorFee;
        metadataUri[_index] = _uri;
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
        return string(abi.encodePacked(_baseTokenURI, metadataUri[tokenId]));
    }

    function setXTokenRouter(address _router) public onlyOwner {
        require(_router != address(0), "zero address is not allowed");
        xTokenRouter = IXTOKENROUTER(_router);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
