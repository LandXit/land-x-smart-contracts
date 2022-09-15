// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

interface IxTokenRouter {
    function getCToken(string memory _name) external view returns(address);
    function getXToken(string memory _name) external view returns(address);
}

interface IOraclePrices  {
    function getXTokenPrice(address xToken) external view returns(uint256);
    function prices(string memory) external view returns(uint256);
    function usdc() external view returns(address);
}



interface IXToken is IERC20 {
    function stake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function xBasketTransfer(address _from, uint256 amount) external;
    function Staked(address) external view returns(uint256 amount, uint256 startTime); // Not
    function availableToClaim(address account) external view returns(uint256);
    function claim() external;
}

contract xBasket is ERC20, Ownable {
    IxTokenRouter public xTokenRouter;
    IOraclePrices public oraclePrices;
    address public xWheat;
    address public xSoy;
    address public xCorn;
    address public xRice;
    address public cWheat;
    address public cSoy;
    address public cCorn;
    address public cRice;
    address public usdc;

    ISwapRouter public constant uniswapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
    
    constructor(address _xTokenRouter, address _oraclePrices) ERC20("xBasket LandX Index Fund", "xBASKET") {
        xTokenRouter = IxTokenRouter(_xTokenRouter);
        oraclePrices = IOraclePrices(_oraclePrices);
        xWheat = xTokenRouter.getXToken("WHEAT");
        xSoy = xTokenRouter.getXToken("SOY");
        xRice = xTokenRouter.getXToken("RICE");
        xCorn = xTokenRouter.getXToken("CORN");
        cWheat = xTokenRouter.getCToken("WHEAT");
        cSoy = xTokenRouter.getCToken("SOY");
        cRice = xTokenRouter.getCToken("RICE");
        cCorn = xTokenRouter.getCToken("CORN");
        usdc = oraclePrices.usdc();
    }

    // Deposit xTokens to mint xBasket
    function mint(uint256 _amount) external {
        IXToken(xWheat).xBasketTransfer(msg.sender,_amount);
        IXToken(xSoy).xBasketTransfer(msg.sender,_amount);
        IXToken(xRice).xBasketTransfer(msg.sender,_amount);
        IXToken(xCorn).xBasketTransfer(msg.sender,_amount);
        IXToken(xWheat).stake(_amount);
        IXToken(xSoy).stake(_amount);
        IXToken(xRice).stake(_amount);
        IXToken(xCorn).stake(_amount);
        uint256 usdVaultValuation = calculateTVL();
        uint256 circulatingSupply = totalSupply();
        // This maths needs testing. From https://solidity-by-example.org/defi/vault/
        uint256 shares;
        if (circulatingSupply == 0) {
            shares = _amount; // initially 1 xBasket = 0.25 of all 4 xTokens
        } else {
            shares = _amount * circulatingSupply / usdVaultValuation;
        }
        _mint(msg.sender, shares);
    }

    function mintPreview(uint256 _amount) public view returns (uint256) {
        uint256 usdVaultValuation = calculateTVL();
        uint256 circulatingSupply = totalSupply();
        uint256 shares;
        if (circulatingSupply == 0) {
            shares = _amount; // initially 1 xBasket = 0.25 of all 4 xTokens
        } else {
            shares = _amount * circulatingSupply / usdVaultValuation;
        }
        return shares;
    }

    // Burn xBasket to redeem xTokens
    function redeem(uint256 _amount) external {
        require(balanceOf(msg.sender) >= _amount, "Your xBasket balance is too low");
        uint256 usdVaultValuation = calculateTVL();
        _burn(msg.sender, _amount);
        autoCompoundRewards(); // make sure we just have xTokens in the vault on redemption.
        uint256 circulatingSupply = totalSupply();
        // This maths needs testing. From https://solidity-by-example.org/defi/vault/
        uint256 redeemAmount;
        if (circulatingSupply == 0) { 
            redeemAmount = _amount;
        } else {
            redeemAmount = (_amount * usdVaultValuation) / circulatingSupply;
        }
        IXToken(xWheat).unstake(redeemAmount);
        IXToken(xSoy).unstake(redeemAmount);
        IXToken(xRice).unstake(redeemAmount);
        IXToken(xCorn).unstake(redeemAmount);
        IXToken(xWheat).transfer(msg.sender,redeemAmount);
        IXToken(xSoy).transfer(msg.sender,redeemAmount);
        IXToken(xRice).transfer(msg.sender,redeemAmount);
        IXToken(xCorn).transfer(msg.sender,redeemAmount);
    }

    function redeemPreview(uint256 _amount) public view returns (uint256) {
        uint256 usdVaultValuation = calculateTVL();
        uint256 circulatingSupply = totalSupply();
        if (circulatingSupply == 0) {
            return _amount;
        }
        uint256 redeemAmount = (_amount * usdVaultValuation) / circulatingSupply;
        return redeemAmount;
    }

    // calculate the value of the contracts xToken holdings in USDC
    function calculateCollateral() public view returns(uint256) {
        // xTokens Balances
        uint256 xWheatBalance = IXToken(xWheat).balanceOf(address(this));
        uint256 xSoyBalance = IXToken(xSoy).balanceOf(address(this));
        uint256 xRiceBalance = IXToken(xRice).balanceOf(address(this));
        uint256 xCornBalance = IXToken(xCorn).balanceOf(address(this));

        (uint256 xWheatStaked,) = IXToken(xWheat).Staked(address(this));
        (uint256 xSoyStaked,) = IXToken(xSoy).Staked(address(this));
        (uint256 xRiceStaked,) = IXToken(xRice).Staked(address(this));
        (uint256 xCornStaked,) = IXToken(xCorn).Staked(address(this));

        // USDC Prices - Note this assumes prices are stored in USDC with 6 decimals
        uint256 xWheatPrice = oraclePrices.getXTokenPrice(xWheat);
        uint256 xSoyPrice = oraclePrices.getXTokenPrice(xSoy);
        uint256 xRicePrice = oraclePrices.getXTokenPrice(xRice);
        uint256 xCornPrice = oraclePrices.getXTokenPrice(xCorn);
        
        // Valutations
        uint256 collateral;
        collateral += (xWheatBalance + xWheatStaked) * xWheatPrice;
        collateral += (xSoyBalance + xSoyStaked) * xSoyPrice;
        collateral += (xRiceBalance + xRiceStaked) * xRicePrice;
        collateral += (xCornBalance + xCornStaked) * xCornPrice;
        return collateral;        
    }

    // calculate the value of the contracts cToken holdings in USDC
    function calculateYield() public view returns(uint256) {
         // cTokens Balnces  
        uint256 cWheatBalance = IERC20(cWheat).balanceOf(address(this));
        uint256 cSoyBalance = IERC20(cSoy).balanceOf(address(this));
        uint256 cRiceBalance = IERC20(cRice).balanceOf(address(this));
        uint256 cCornBalance = IERC20(cCorn).balanceOf(address(this));

        // Rewards Pending & USDC balance
        uint256 cWheatPending = IXToken(xWheat).availableToClaim(address(this));
        uint256 cSoyPending = IXToken(xSoy).availableToClaim(address(this));
        uint256 cRicePending = IXToken(xRice).availableToClaim(address(this));
        uint256 cCornPending = IXToken(xCorn).availableToClaim(address(this));      
        uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));

        // USDC Prices - Note this assumes prices are stored in USDC with 6 decimals
        uint256 cWheatPrice = oraclePrices.prices("WHEAT");
        uint256 cSoyPrice = oraclePrices.prices("SOY");
        uint256 cRicePrice = oraclePrices.prices("RICE");
        uint256 cCornPrice = oraclePrices.prices("CORN");

        // Valutations
        uint256 totalYield = usdcBalance;
        totalYield += (cWheatBalance + cWheatPending) * cWheatPrice;
        totalYield += (cSoyBalance + cSoyPending) * cSoyPrice;
        totalYield += (cRiceBalance + cRicePending) * cRicePrice;
        totalYield += (cCornBalance + cCornPending) * cCornPrice;
        return totalYield;    
    }

    // calculate the value of the contracts holdings in USDC
    function calculateTVL() public view returns(uint256) {
        uint256 totalCollateral = calculateCollateral();
        uint256 totalYield = calculateYield();
        uint256 tvl = totalCollateral + totalYield;
        return tvl;        
    }

    // calculate price per token
    function pricePerToken() public view returns(uint256) {
        uint256 tvl = calculateTVL();
        uint256 circulatingSupply = totalSupply();
        uint256 xBasketPrice = tvl * 1e18 / circulatingSupply; // price is usdc (6 decimals) for 1 xBasket
        return xBasketPrice;
    }

    // claim rewards, sell cTokens, buy xTokens, stake new xTokens
    function autoCompoundRewards() public {
        IXToken(xWheat).claim();
        IXToken(xSoy).claim();
        IXToken(xRice).claim();
        IXToken(xCorn).claim();
        uint256 cWheatBalance = IERC20(cWheat).balanceOf(address(this));
        uint256 cSoyBalance = IERC20(cSoy).balanceOf(address(this));
        uint256 cRiceBalance = IERC20(cRice).balanceOf(address(this));
        uint256 cCornBalance = IERC20(cCorn).balanceOf(address(this));
       
        ERC20Burnable(cWheat).burn(cWheatBalance);  //Sell cWheat
        convertToXToken(xWheat); //Buy xWheat
       
        ERC20Burnable(cSoy).burn(cSoyBalance);  //Sell cSoy
        convertToXToken(xSoy); //Buy xSoy
       
        ERC20Burnable(cRice).burn(cRiceBalance);  //Sell cRice
        convertToXToken(xRice); //Buy xRice
        
        ERC20Burnable(cCorn).burn(cCornBalance); //Sell cCorn
        convertToXToken(xCorn); //Buy xCorn

        uint256 xWheatBalance = IXToken(xWheat).balanceOf(address(this));
        uint256 xSoyBalance = IXToken(xSoy).balanceOf(address(this));
        uint256 xRiceBalance = IXToken(xRice).balanceOf(address(this));
        uint256 xCornBalance = IXToken(xCorn).balanceOf(address(this));
        IXToken(xWheat).stake(xWheatBalance);
        IXToken(xSoy).stake(xSoyBalance);
        IXToken(xRice).stake(xRiceBalance);
        IXToken(xCorn).stake(xCornBalance);
    }

     function convertToXToken(address xToken) internal returns(uint256) {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
            usdc,
            xToken,
            3000,
            address(this),
            block.timestamp + 15,
            IERC20(usdc).balanceOf(address(this)),
            1,
            0
        );
        return uniswapRouter.exactInputSingle(params);
    }
}