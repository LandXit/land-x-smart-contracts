// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";
import "../interfaces/IxTokenRouter.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IxToken is IERC20 {
   function symbol() external view returns (string memory);
   function claim() external;
   function crop() external view returns (string memory);
   function burn(uint256 amount) external; 
   function mint(address account, uint256 amount) external;
   function burnFrom(address account, uint256 amount) external;
   function stake(uint256 amount) external;
   function unstake(uint256 amount) external;
   function Staked(address)  external view returns (uint256 amount, uint256 startTime);
}

interface IcToken is IERC20 {
   function balanceOf(address account) external view returns (uint256);
   function symbol() external view returns (string memory);
   function crop() external view returns (string memory);
   function mint(address account, uint256 amount) external;
   function burn(uint256 amount) external;
   function burnFrom(address account, uint256 amount) external;
}


//LayerZero endpoints addresses
//Etherium 0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675, 101,
//Goerli 0xbfD2135BFfbb0B5378b56643c2Df8a87552Bfa23, 10121
//Arbitrum 0x3c2269811836af69497E5F486A85D7316753cf62, 110
//Arbitrum-Goerli 0x6aB5Ae6822647046626e83ee6dB8187151E1d5ab, 10143
contract XTokenBridge is NonblockingLzApp {
    IxTokenRouter public  xTokenRouter;
    uint16 public constant mainChainId = 10121; //10121-goerli, 101-etherium

    event Sent(address token, address to, uint256 amount, uint16 destinationChainId);
    event Received(address token, address to, uint256 amount, uint16 sourceChainId);

    constructor(address _lzEndpoint, address _xTokenRouter) NonblockingLzApp(_lzEndpoint) {
        xTokenRouter = IxTokenRouter(_xTokenRouter);
    }

    using BytesLib for bytes;

    

   function estimateFee(address _token, uint16 _dstChainId, address _toAddress, uint _amount) public view returns (uint nativeFee, uint zroFee) {
        string memory tokenType = _getTokenType(_token);
        if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("x"))) {
            bytes memory payload = abi.encode(
                tokenType,
                IxToken(_token).crop(),
                _toAddress,
                _amount
            );

         return lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, bytes(""));
        }
        
        if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("c"))) {
              bytes memory payload = abi.encode(
                    tokenType,
                    IcToken(_token).crop(),
                    _toAddress,
                    _amount
                );
        return lzEndpoint.estimateFees(_dstChainId, address(this), payload, false, bytes(""));
        }
    return (0,0);
   }
   
   function sendToken(address _token, uint16 _dstChainId, address _toAddress, uint _amount) public payable {
        string memory tokenType = _getTokenType(_token);
        if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("x"))) {
            require(_token == xTokenRouter.getXToken(IxToken(_token).crop()), "not allowed token");
            if (lzEndpoint.getChainId() == (mainChainId - 100)) {
            IxToken(_token).transferFrom(msg.sender, address(this), _amount);
            IxToken(_token).stake(_amount);
         } else {
            IxToken(_token).burnFrom(msg.sender, _amount);
         }
         
         bytes memory payload = abi.encode(
             tokenType,
             IxToken(_token).crop(),
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
        emit Sent(_token, _toAddress, _amount, _dstChainId);
        return;
        }

        if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("c"))) {
             require(_token == xTokenRouter.getCToken(IcToken(_token).crop()), "not allowed token");
             if (lzEndpoint.getChainId() != (mainChainId - 100)) {
                IcToken(_token).burnFrom(msg.sender, _amount);
             } else {
                IcToken(_token).transferFrom(msg.sender, address(this), _amount);
             }
              bytes memory payload = abi.encode(
                    tokenType,
                    IcToken(_token).crop(),
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
                emit Sent(_token, _toAddress, _amount, _dstChainId);
        }
   }

    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory, uint64, bytes memory _payload) internal override {
        (
            string memory tokenType,
            string memory crop,
            address to,
            uint amount
        ) = abi.decode(_payload, (string, string, address, uint));

        if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("x"))) {
            address xToken = xTokenRouter.getXToken(crop);
            if (lzEndpoint.getChainId() == (mainChainId - 100)) {
                 IxToken(xToken).unstake(amount);
                 IxToken(xToken).transfer(to, amount);
            } else {
                IxToken(xToken).mint(to, amount);
            }
            emit Received(xToken, to, amount, _srcChainId);
        }

        if (keccak256(abi.encodePacked(tokenType)) == keccak256(abi.encodePacked("c"))) {
            address xToken = xTokenRouter.getXToken(crop);
            address cToken = xTokenRouter.getCToken(crop);
            if (lzEndpoint.getChainId() == (mainChainId - 100)) {
                if (IcToken(cToken).balanceOf(address(this)) < amount) {
                    IxToken(xToken).claim();
                }
                IcToken(cToken).transfer(to, amount);
            } else {
                IcToken(cToken).mint(to, amount);
            }
            emit Received(cToken, to, amount, _srcChainId);
        }
    }

    function _getTokenType(address _token) internal view returns(string memory) {
        bytes memory firstChar = new bytes(1);
        firstChar[0] = bytes(IxToken(_token).symbol())[0];
        return string(firstChar);
    }

}
