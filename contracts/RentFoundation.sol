// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";


contract RentFoundation is 
    Context,
    Ownable,
    AccessControlEnumerable
{
    IERC20 public usdc;
   
    event rentPaid(uint256 tokenID, uint256 amount);
    event withdrawn(address to, uint256 amount, uint256 nonce);
    event initialRentPaid(uint256 tokenID, uint256 amount);
    
    uint256 public rentPaidAmount;
    uint256 public rentWithdrawnAmount;
    address signer;

    mapping(uint256 => bool) public usedNonces;
    mapping(uint256 => bool) public initialRentApplied;

    bytes32 public constant INITIAL_RENT_PAYER_ROLE = keccak256("INITIAL_RENT_PAYER_ROLE");

    constructor(address _usdc, address _address)
    {
		usdc = IERC20(_usdc);
        _setupRole(DEFAULT_ADMIN_ROLE, _address);
	}

    function payRent(uint256 tokenID, uint256 amount) external {
        require(initialRentApplied[tokenID], "Initial rent was not applied");
        require(usdc.transferFrom(msg.sender, address(this), amount), "transfer failed");
        rentPaidAmount += amount;
        emit rentPaid(tokenID, amount);
    }

    function withdrawRent(uint256 amount, uint256 nonce, bytes calldata sig) external {
        require(!usedNonces[nonce]);
        
        bytes32 message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", msg.sender, amount, nonce, this));

        require(recoverSigner(message, sig) == owner());

        require(usdc.transfer(msg.sender, amount), "Withdraw fiailed");
        rentWithdrawnAmount += amount;
        usedNonces[nonce] = true;

        emit withdrawn(msg.sender, amount, nonce);
    }

    function payInitialRent(uint256 tokenID, uint256 amount) external {
        require(!initialRentApplied[tokenID], "Initial Paymant already applied");
        require(hasRole(INITIAL_RENT_PAYER_ROLE, msg.sender), "not initial payer");
        require(usdc.transferFrom(tx.origin, address(this), amount), "Initial payment failed");
        initialRentApplied[tokenID] = true;
        rentPaidAmount += amount;
        emit initialRentPaid(tokenID, amount);
    }

    function setSigner(address _signer) public onlyOwner {
        signer = _signer;
    }

    function splitSignature(bytes memory sig)
        internal
        pure
        returns (uint8, bytes32, bytes32)
    {
        //require(sig.length == 65);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
    }

    function recoverSigner(bytes32 message, bytes memory sig)
        internal
        pure
        returns (address)
    {
        uint8 v;
        bytes32 r;
        bytes32 s;

        (v, r, s) = splitSignature(sig);

        return ecrecover(message, v, r, s);
    }
    
    
    //owner can withdraw any token sent here. should be used with care
	function reclaimToken(IERC20 token, uint256 _amount) external onlyOwner {
		require(address(token) != address(0), "no 0 address");
		uint256 balance = token.balanceOf(address(this));
		require(_amount <= balance, "you can't withdraw more than you have");
		token.transfer(msg.sender, _amount);
	}

    //owner can withdraw any ETH sent here
	function withdraw() external onlyOwner {
		uint256 balance = address(this).balance;
		payable(msg.sender).transfer(balance);
	}
}