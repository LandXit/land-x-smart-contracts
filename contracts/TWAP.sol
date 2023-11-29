// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolImmutables.sol";
import "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolState.sol";
import "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolDerivedState.sol";
import "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolActions.sol";
import "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolOwnerActions.sol";
import "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolEvents.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "./interfaces/ITWAP.sol";

interface IERC20Extented{
    function decimals() external view returns (uint8);
}

contract TWAP is ITWAP{

    address immutable uniswapFactory;
    uint24 constant fee = 3000; 
    
    constructor (address _uniswapFactory) {
       require(_uniswapFactory != address(0), "zero address is not allowed");
       uniswapFactory = _uniswapFactory;
    }

    function getPrice(address tokenIn, address tokenOut) public override view returns (uint) {
        address uniswapV3Pool = _getUniswapPool(tokenIn, tokenOut);
        if (uniswapV3Pool == address(0)) {
            revert("pool not found");
        }

        address poolToken0 = IUniswapV3Pool(uniswapV3Pool).token0();
        uint32 twapInterval = 3600; // 1 hour
        uint32 toLastObservationInterval = 0;
        (,,uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext,,) = IUniswapV3Pool(uniswapV3Pool).slot0();
        if (observationCardinality <= observationCardinalityNext) {
             (uint32  blockTimestamp,,, bool initialized) = IUniswapV3Pool(uniswapV3Pool).observations(observationIndex);
             if (initialized) {
                 toLastObservationInterval = uint32(block.timestamp) - blockTimestamp;
             }
        }
        if (observationCardinality <= observationCardinalityNext) {
             (uint32  blockTimestamp,,, bool initialized) = IUniswapV3Pool(uniswapV3Pool).observations(observationIndex);
            if (initialized) {
                 toLastObservationInterval = uint32(block.timestamp) - blockTimestamp;
             }
        } else {
            if (observationIndex < (observationCardinality - 1)) {
                (uint32  blockTimestamp,,, bool initialized) = IUniswapV3Pool(uniswapV3Pool).observations(observationIndex + 1);
                             if (initialized) {
                 toLastObservationInterval = uint32(block.timestamp) - blockTimestamp;
             }
            } else {
                 (uint32  blockTimestamp,,, bool initialized) = IUniswapV3Pool(uniswapV3Pool).observations(0);
                             if (initialized) {
                 toLastObservationInterval = uint32(block.timestamp) - blockTimestamp;
             }
            }
        }
        if (toLastObservationInterval < twapInterval) {
            twapInterval = toLastObservationInterval;
        }

        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = twapInterval;
        secondsAgos[1] = 0;
        (int56[] memory tickCumulatives, ) = IUniswapV3Pool(uniswapV3Pool).observe(secondsAgos);
        uint160 sqrtPriceX96 = TickMath.getSqrtRatioAtTick(int24((tickCumulatives[1] - tickCumulatives[0]) / twapInterval));
        uint price;
        if (poolToken0 == tokenOut) {
            price = 10 ** (IERC20Extented(tokenIn).decimals() + IERC20Extented(tokenOut).decimals()) / ((uint(sqrtPriceX96) * uint(sqrtPriceX96) * (10 ** IERC20Extented(tokenOut).decimals())) >> (96 * 2));
            return price;
        }
        price = uint(sqrtPriceX96) * (uint(sqrtPriceX96)) * (10 ** IERC20Extented(tokenOut).decimals()) >> (96 * 2);
        return price;
    }

     function _getUniswapPool(address tokenIn, address tokenOut) internal view returns (address) {
        return IUniswapV3Factory(uniswapFactory).getPool(tokenIn, tokenOut, fee);
    }
}