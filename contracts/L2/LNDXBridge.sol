// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "https://github.com/LayerZero-Labs/solidity-examples/blob/main/contracts/lzApp/NonblockingLzApp.sol";
import "./interfaces/IxTokenRouter.sol";
//import "https://github.com/LayerZero-Labs/LayerZero/blob/main/contracts/interfaces/ILayerZeroEndpoint.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILNDX is IERC20 {
   function burn(uint256 amount) external; 
   function mint(address account, uint256 amount) external;
   function burnFrom(address account, uint256 amount) external;
}

//LayerZero endpoints addresses
//Etherium 0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675, 101,
//Goerli 0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23, 10121
//Arbitrum 0x3c2269811836af69497E5F486A85D7316753cf62, 110
//Arbitrum-Goerli 0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab, 10143
contract LndxBridge is NonblockingLzApp {
    ILNDX public lndx;

    uint16 public constant mainChainId = 10121; //10121-goerli, 101-etherium

    event Sent(address token, address to, uint256 amount, uint16 destinationChainId);
    event Received(address token, address to, uint256 amount, uint16 sourceChainId);

    constructor(address _lzEndpoint, address _lndx) NonblockingLzApp(_lzEndpoint) {
        lndx = ILNDX(_lndx);
    }

    using BytesLib for bytes;

   function estimateFee(uint16 _dstChainId, address _toAddress, uint _amount) public view returns (uint nativeFee, uint zroFee) {
         bytes memory payload = abi.encode(
             _toAddress,
             _amount
         );
         return lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, bytes(""));
   }
   
   function sendToken(uint16 _dstChainId, address _toAddress, uint _amount) public payable {
        if (lzEndpoint.getChainId() == (mainChainId - 100)) {
            lndx.transferFrom(msg.sender, address(this), _amount);
         } else {
            lndx.burnFrom(msg.sender, _amount);
         }
         
         bytes memory payload = abi.encode(
             _toAddress,
             _amount
         );

         _lzSend( 
            _dstChainId, 
            payload,
            payable(msg.sender), 
            address(0x0), 
            bytes(""), 
            msg.value
        );
        emit Sent(address(lndx),  _toAddress, _amount, _dstChainId);
   }

    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory, uint64, bytes memory _payload) internal override {
        (
            address to,
            uint amount
        ) = abi.decode(_payload, (address, uint));

            if (lzEndpoint.getChainId() == (mainChainId - 100)) {
                 lndx.transfer(to, amount);
            } else {
                lndx.mint(to, amount);
            }
            emit Received(address(lndx),  to, amount, _srcChainId);
    }
}