// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "./interfaces/IKeyProtocolVariables.sol";
import "./interfaces/IOraclePrices.sol";

contract OraclePrices is IOraclePrices, Context, AccessControlEnumerable {
    bytes32 public constant PRICE_SETTER_ROLE = keccak256("PRICE_SETTER_ROLE");

    mapping(string => uint256) public prices; ///["SOY" = 560000, ...]

    mapping(address => uint256) internal xTokenPrices;

    IKeyProtocolVariables public keyProtocolValues;

    IUniswapV3Factory public uniswapFactory;
    address public immutable usdc; 

    constructor(
        address _admin,
        address _keyProtocolValue,
        address _uniswapFactory,
        address _usdc
    ) {
        require(_admin != address(0), "zero address is not allowed");
        require(_keyProtocolValue != address(0), "zero address is not allowed");
        require(_uniswapFactory != address(0), "zero address is not allowed");
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);

        prices["SOY"] = 543072881;
        prices["WHEAT"] = 315324900;
        prices["RICE"] = 350771520;
        prices["CORN"] = 257086614;

        keyProtocolValues = IKeyProtocolVariables(_keyProtocolValue);
        uniswapFactory = IUniswapV3Factory(_uniswapFactory);
        usdc = _usdc;
    }

    function setGrainPrice(string memory grain, uint256 price) public {
        require(hasRole(PRICE_SETTER_ROLE, msg.sender), "not price setter");
        require(price > 0 && price < 9999999999, "Invalid values");
        prices[grain] = price;
    }

    function setXTokenPrice(address xToken, uint256 price) public {
        require(hasRole(PRICE_SETTER_ROLE, msg.sender), "not price setter");
        require(xToken != address(0), "xToken address can't be zero");
        require(price > 0 && price < 9999999999, "Invalid values");
        xTokenPrices[xToken] = price;
    }

    function getXTokenPrice(address xToken) public view returns (uint256) {
        if (keyProtocolValues.preLaunch() == true) {
            return xTokenPrices[xToken];
        }

        address pool = getXtokenPool(xToken);
        if (pool == address(0)) {
            revert("Pool not found");
        }

        address poolToken0 = IUniswapV3Pool(pool).token0();
        uint160 sqrtPriceX96;

        (sqrtPriceX96, , , , , , ) = IUniswapV3Pool(pool).slot0();
        if (poolToken0 == usdc) {
            return
                1e12 /
                ((uint256(sqrtPriceX96) * uint256(sqrtPriceX96) * 1e6) >> // USDC and xToken has 6 deciamls
                    (96 * 2));
        }
        return ((uint256(sqrtPriceX96) * uint256(sqrtPriceX96) * 1e6) >> // USDC and xToken has 6 deciamls
            (96 * 2));
    }

    function getXtokenPool(address xToken) public view returns (address) {
        return IUniswapV3Factory(uniswapFactory).getPool(usdc, xToken, 3000);
    }
}
