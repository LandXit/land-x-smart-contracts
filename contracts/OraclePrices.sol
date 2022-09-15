// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IUniswapPool { 
    function slot0() external view returns(uint160, int24, uint16, uint16, uint16, uint8, bool);
    function token0() external view returns (address);
}

interface IKeyProtocolValues {
    function preLaunch() external pure returns(bool);
}

contract OraclePrices is 
    Context,
    Ownable,
    AccessControlEnumerable
{
    bytes32 public constant PRICE_SETTER_ROLE = keccak256("PRICE_SETTER_ROLE");

    mapping(string => uint256) public prices; ///["SOY" = 560000, ...]

    mapping(address => uint256) internal xTokenPrices;

    IKeyProtocolValues public keyProtocolValues;

    address public uniswapFactory = address(0x1F98431c8aD98523631AE4a59f267346ea31F984);
    address public usdc = address(0x4FEB71333c2A9fE81625a5727ab0Ed33dC77B841); // to be changed for mainnet

    constructor(address _address, address _xWheat, address _xSoy, address _xCorn, address _xRice, address _keyProtocolValue)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _address);

        prices["SOY"] = 577244585;
        prices["WHEAT"] = 327000000;
        prices["RICE"] = 336008409;
        prices["CORN"] = 261023622;

        xTokenPrices[_xWheat] = 5000000;
        xTokenPrices[_xCorn] = 4430000;
        xTokenPrices[_xSoy] = 8140000;
        xTokenPrices[_xRice] = 6000000;
        keyProtocolValues = IKeyProtocolValues(_keyProtocolValue);
	}

    function setGrainPrice(string memory grain, uint256 price) public {
        require(hasRole(PRICE_SETTER_ROLE, msg.sender), "not price setter");
        require(price > 0 && price < 9999999999, "Invalid values");
        prices[grain] = price;
    }

    function setXTokenPrice(address xToken, uint256 price) public {
        require(hasRole(PRICE_SETTER_ROLE, msg.sender), "not price setter");
        require(price > 0 && price < 9999999999, "Invalid values");
        xTokenPrices[xToken] = price;
    }

    function getXTokenPrice(address xToken) public view returns(uint256) {
        if(keyProtocolValues.preLaunch() == true) {
            return xTokenPrices[xToken];
        }

        address pool = getXtokenPool(xToken);
        if (pool == address(0)) {
             return xTokenPrices[xToken];
        }
        
        address poolToken0 = IUniswapPool(pool).token0();
        uint160 sqrtPriceX96;

        (sqrtPriceX96,,,,,,) =  IUniswapPool(pool).slot0();
        if (poolToken0 == usdc) {
           return 1e12 / ((uint(sqrtPriceX96) * uint(sqrtPriceX96) * 1e6) >> (96 * 2));
        }
        return ((uint(sqrtPriceX96) * uint(sqrtPriceX96) * 1e6) >> (96 * 2));
    }

    function getXtokenPool(address xToken) public view returns(address) {
        return IUniswapV3Factory(uniswapFactory).getPool(usdc, xToken, 3000);
    }
}