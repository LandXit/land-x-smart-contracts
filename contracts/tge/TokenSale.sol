// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract TokenSale {
    address public multisig;
    uint public tokenSaleStage = 0; // 0 = Omega, 1 = Alpha, 2 = Whitelist
    bytes32[3] public merkleRoots;
    address public usdc = 0xCd869cbCA8E597a10b6e1AEbF12aBFD693e542f2; //update for mainnet
    address public lndx = 0x534f0e10C9e5b392c75991CB59c560Db6256aea9; //update for mainnet
    uint public priceMultiplier = 2; // $0.5/LNDX 1e6 = 5e5 = (x = 1e6 / 5e5) = 2
    mapping(address => uint[3]) public claimed;

    constructor() {
        multisig = msg.sender;
        merkleRoots[0] = 0x1f2ede652390c98d48f086e75cf059697b65eb6f58199258a061e1eb38f00771;
        merkleRoots[1] = 0x223353dd9538fe9acd7e7469920d5a4a9c83b82a2377246f1c14ea09e43f935f;
        merkleRoots[2] = 0xbaef4c074bdf663e724d3cd4ca9fafa42527b8582c0f30e3998ca4ed8568ce1a;
    }

    function checkProof(address _user, bytes32[] calldata _merkleProof) public view returns(bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_user));
        bool result = MerkleProof.verify(_merkleProof, merkleRoots[tokenSaleStage], leaf);
        return result;
    }

    function buyTokens(uint _amountUSDC, bytes32[] calldata _merkleProof) external {
        claimed[msg.sender][tokenSaleStage] += _amountUSDC;
        require(checkProof(msg.sender, _merkleProof) == true, "Merkle proof does not validate");
        IERC20(usdc).transferFrom(msg.sender, address(this), _amountUSDC);
        uint lndxOut = _amountUSDC * priceMultiplier;
        IERC20(lndx).transfer(msg.sender, lndxOut);
    }

    function updateMultisig(address _multisig) external {
        require(msg.sender == multisig, "only multisig has access");
        multisig = _multisig;
    }

    function updateMerkleRoots(uint _tokenSaleStage, bytes32 _omegaRoot, bytes32 _alphaRoot, bytes32 _whitelistRoot) external {
        require(msg.sender == multisig, "only multisig has access");
        tokenSaleStage = _tokenSaleStage;
        merkleRoots[0] = _omegaRoot;
        merkleRoots[1] = _alphaRoot;
        merkleRoots[2] = _whitelistRoot;
    }

    function updatePrice(uint _priceMultiplier) external {
        require(msg.sender == multisig, "only multisig has access");
        priceMultiplier = _priceMultiplier;
    }

    function updateTokens(address _usdc, address _lndx) external {
        require(msg.sender == multisig, "only multisig has access");
        usdc = _usdc;
        lndx = _lndx;
    }

    function reclaimToken(IERC20 token) external {
        require(msg.sender == multisig, "only multisig has access");
        require(address(token) != address(0));
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
    }
}
