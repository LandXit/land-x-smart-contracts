// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "./interfaces/IKeyProtocolVariables.sol";
import "./interfaces/IxTokenRouter.sol";
import "./interfaces/IOraclePrices.sol";
import "./interfaces/IxToken.sol";
import "./interfaces/ITWAP.sol";

contract xBasket is ERC20, IERC4626, Ownable {
    IxTokenRouter public xTokenRouter;
    IOraclePrices public oraclePrices;
    IKeyProtocolVariables public keyProtocolValues;
    address public xWheat;
    address public xSoy;
    address public xCorn;
    address public xRice;
    address public cWheat;
    address public cSoy;
    address public cCorn;
    address public cRice;
    address public usdc;

    ISwapRouter public uniswapRouter;
    ITWAP public twap;

    event AutoCompounded(uint256 xWheat, uint256 xSoy, uint256 xRice, uint256 xCorn);

    constructor(
        address _xTokenRouter,
        address _oraclePrices,
        address _keyProtocolValues,
        address _uniswapRouter,
        address _twap
    ) ERC20("xBasket LandX Index Fund", "xBASKET") {
        require(_xTokenRouter != address(0), "zero address is not allowed");
        require(_oraclePrices != address(0), "zero address is not allowed");
        require(_keyProtocolValues != address(0), "zero address is not allowed");
        require(_uniswapRouter != address(0), "zero address is not allowed");
        xTokenRouter = IxTokenRouter(_xTokenRouter);
        oraclePrices = IOraclePrices(_oraclePrices);
        keyProtocolValues = IKeyProtocolVariables(_keyProtocolValues);
        xWheat = xTokenRouter.getXToken("WHEAT");
        xSoy = xTokenRouter.getXToken("SOY");
        xRice = xTokenRouter.getXToken("RICE");
        xCorn = xTokenRouter.getXToken("CORN");
        cWheat = xTokenRouter.getCToken("WHEAT");
        cSoy = xTokenRouter.getCToken("SOY");
        cRice = xTokenRouter.getCToken("RICE");
        cCorn = xTokenRouter.getCToken("CORN");
        usdc = oraclePrices.usdc();
        uniswapRouter = ISwapRouter(_uniswapRouter);
        twap = ITWAP(_twap);
    }

    // We have 4 underlying tokens
    function asset() public view override returns (address) {
        return usdc;
    }

    // return underlying assets amount in USDC
    function totalAssets() public view override returns (uint256) {
        return calculateTVL();
    }

    function convertToShares(uint256 assets)
        public
        view
        override
        returns (uint256)
    {
        return _convertToShares(assets);
    }

    function _convertToShares(uint256 assets)
        internal
        view
        returns (uint256 shares)
    {
        uint256 usdVaultValuation = calculateTVL();
        uint256 circulatingSupply = totalSupply();
        if (circulatingSupply == 0) {
            shares = 4 * assets; // initially 1 xBasket = 0.25 of all 4 xTokens
        } else {
            uint256 xWheatPrice = twap.getPrice(xWheat, usdc);
            uint256 xSoyPrice = twap.getPrice(xSoy, usdc);
            uint256 xRicePrice = twap.getPrice(xRice, usdc);
            uint256 xCornPrice = twap.getPrice(xCorn, usdc);
            shares =
                (assets *
                    (xWheatPrice + xSoyPrice + xCornPrice + xRicePrice) *
                    circulatingSupply) /
                usdVaultValuation /
                1e6;
        }
        return shares;
    }

    function convertToAssets(uint256 shares)
        public
        view
        override
        returns (uint256)
    {
        return _convertToAssets(shares);
    }

    function _convertToAssets(uint256 shares) internal view returns (uint256) {
        uint256 usdVaultValuation = calculateTVL();
        uint256 circulatingSupply = totalSupply();
        if (circulatingSupply == 0) {
            return shares / 4;
        }
        uint256 xWheatPrice = twap.getPrice(xWheat, usdc);
        uint256 xSoyPrice = twap.getPrice(xSoy, usdc);
        uint256 xRicePrice = twap.getPrice(xRice, usdc);
        uint256 xCornPrice = twap.getPrice(xCorn, usdc);
        uint256 redeemAmount = (1e6 * shares * usdVaultValuation) /
            circulatingSupply /
            (xWheatPrice + xSoyPrice + xRicePrice + xCornPrice);
        return redeemAmount;
    }

    function maxDeposit(address receiver)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _findMinAssetBalanceValue(receiver);
    }

    function maxMint(address receiver)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _convertToShares(_findMinAssetBalanceValue(receiver));
    }

    function maxWithdraw(address owner)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _convertToAssets(balanceOf(owner));
    }

    function maxRedeem(address owner)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return balanceOf(owner);
    }

    function previewDeposit(uint256 assets)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _convertToShares(assets);
    }

    function previewMint(uint256 shares)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _convertToAssets(shares);
    }

    function previewWithdraw(uint256 assets)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _convertToShares(assets);
    }

    function previewRedeem(uint256 shares)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return _convertToAssets(shares);
    }

    function deposit(uint256 assets, address receiver)
        public
        virtual
        override
        returns (uint256)
    {
        require(
            assets <= maxDeposit(msg.sender),
            "ERC4626: deposit more than max"
        );

        uint256 shares = previewDeposit(assets);
        _deposit(msg.sender, receiver, assets, shares);

        return shares;
    }

    function mint(uint256 shares, address receiver)
        public
        virtual
        override
        returns (uint256)
    {
        require(shares <= maxMint(msg.sender), "ERC4626: mint more than max");

        uint256 assets = previewMint(shares);
        _deposit(msg.sender, receiver, assets, shares);

        return assets;
    }

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override returns (uint256) {
        require(
            assets <= maxWithdraw(owner),
            "ERC4626: withdraw more than max"
        );

        uint256 shares = previewWithdraw(assets);
        _withdraw(_msgSender(), receiver, owner, assets, shares);

        return shares;
    }

    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual override returns (uint256) {
        require(shares <= maxRedeem(owner), "ERC4626: redeem more than max");

        uint256 assets = previewRedeem(shares);
        _withdraw(_msgSender(), receiver, owner, assets, shares);

        return assets;
    }

    function _findMinAssetBalanceValue(address owner)
        internal
        view
        returns (uint256)
    {
        uint256 xWheatBalance = IxToken(xWheat).balanceOf(owner);
        uint256 xSoyBalance = IxToken(xSoy).balanceOf(owner);
        uint256 xRiceBalance = IxToken(xRice).balanceOf(owner);
        uint256 xCornBalance = IxToken(xCorn).balanceOf(owner);
        uint256[4] memory balances = [
            xWheatBalance,
            xSoyBalance,
            xRiceBalance,
            xCornBalance
        ];
        uint256 smallest = xWheatBalance;
        uint256 i;
        for (i = 0; i < balances.length; i++) {
            if (balances[i] < smallest) {
                smallest = balances[i];
            }
        }
        return smallest;
    }

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal {
        IxToken(xWheat).xBasketTransfer(caller, assets);
        IxToken(xSoy).xBasketTransfer(caller, assets);
        IxToken(xRice).xBasketTransfer(caller, assets);
        IxToken(xCorn).xBasketTransfer(caller, assets);
        IxToken(xWheat).stake(assets);
        IxToken(xSoy).stake(assets);
        IxToken(xRice).stake(assets);
        IxToken(xCorn).stake(assets);
        _mint(receiver, shares);
        emit Deposit(caller, receiver, assets, shares);
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal {
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }
        autoCompoundRewards();

        _burn(owner, shares);
        IxToken(xWheat).unstake(assets);
        IxToken(xSoy).unstake(assets);
        IxToken(xRice).unstake(assets);
        IxToken(xCorn).unstake(assets);
        IxToken(xWheat).transfer(receiver, assets);
        IxToken(xSoy).transfer(receiver, assets);
        IxToken(xRice).transfer(receiver, assets);
        IxToken(xCorn).transfer(receiver, assets);
        emit Withdraw(caller, receiver, owner, assets, shares);
    }

    // calculate the value of the contracts xToken holdings in USDC
    function calculateCollateral() public view returns (uint256) {
        // xTokens Balances
        uint256 xWheatBalance = IxToken(xWheat).balanceOf(address(this));
        uint256 xSoyBalance = IxToken(xSoy).balanceOf(address(this));
        uint256 xRiceBalance = IxToken(xRice).balanceOf(address(this));
        uint256 xCornBalance = IxToken(xCorn).balanceOf(address(this));

        (uint256 xWheatStaked, ) = IxToken(xWheat).Staked(address(this));
        (uint256 xSoyStaked, ) = IxToken(xSoy).Staked(address(this));
        (uint256 xRiceStaked, ) = IxToken(xRice).Staked(address(this));
        (uint256 xCornStaked, ) = IxToken(xCorn).Staked(address(this));

        // USDC Prices - Note this assumes prices are stored in USDC with 6 decimals
        uint256 xWheatPrice = twap.getPrice(xWheat, usdc);
        uint256 xSoyPrice = twap.getPrice(xSoy, usdc);
        uint256 xRicePrice = twap.getPrice(xRice, usdc);
        uint256 xCornPrice = twap.getPrice(xCorn, usdc);

        // Valutations
        uint256 collateral;
        collateral += (xWheatBalance + xWheatStaked) * xWheatPrice; 
        collateral += (xSoyBalance + xSoyStaked) * xSoyPrice;
        collateral += (xRiceBalance + xRiceStaked) * xRicePrice;
        collateral += (xCornBalance + xCornStaked) * xCornPrice;
        collateral = collateral / 1e6; //USDC has 6 decimals
        return collateral;
    }

    // calculate the value of the contracts cToken holdings in USDC
    function calculateYield() public view returns (uint256) {
        // Rewards Pending & USDC balance
        uint256 cWheatPending = IxToken(xWheat).availableToClaim(address(this));
        uint256 cSoyPending = IxToken(xSoy).availableToClaim(address(this));
        uint256 cRicePending = IxToken(xRice).availableToClaim(address(this));
        uint256 cCornPending = IxToken(xCorn).availableToClaim(address(this));
        uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));

        // USDC Prices - Note this assumes prices are stored in USDC with 6 decimals
        uint256 cWheatPrice = oraclePrices.prices("WHEAT");
        uint256 cSoyPrice = oraclePrices.prices("SOY");
        uint256 cRicePrice = oraclePrices.prices("RICE");
        uint256 cCornPrice = oraclePrices.prices("CORN");

        // Valutations
        uint256 totalYield = usdcBalance;
        totalYield +=
            ((IERC20(cWheat).balanceOf(address(this)) + cWheatPending) *
                cWheatPrice) /
            1e9;  // cTokenparices are per megatonne, 1 cTokenPrice = 1 price per kg, so we divide by 1e9
        totalYield +=
            ((IERC20(cSoy).balanceOf(address(this)) + cSoyPending) *
                cSoyPrice) /
            1e9;
        totalYield +=
            ((IERC20(cRice).balanceOf(address(this)) + cRicePending) *
                cRicePrice) /
            1e9;
        totalYield +=
            ((IERC20(cCorn).balanceOf(address(this)) + cCornPending) *
                cCornPrice) /
            1e9;
        return totalYield;
    }

    // calculate the value of the contracts holdings in USDC
    function calculateTVL() public view returns (uint256) {
        uint256 totalCollateral = calculateCollateral();
        uint256 totalYield = calculateYield();
        uint256 tvl = totalCollateral + totalYield;
        return tvl;
    }

    // calculate price per token
    function pricePerToken() public view returns (uint256) {
        uint256 tvl = calculateTVL();
        uint256 circulatingSupply = totalSupply();
        if (circulatingSupply == 0) {
            return 0;
        }
        uint256 xBasketPrice = (tvl * 1e6) / circulatingSupply; // price is usdc (6 decimals) for 1 xBasket
        return xBasketPrice;
    }

    // claim rewards, sell cTokens, buy xTokens, stake new xTokens
    function autoCompoundRewards() public {
        IxToken(xWheat).claim();
        IxToken(xSoy).claim();
        IxToken(xRice).claim();
        IxToken(xCorn).claim();
        uint256 cWheatBalance = IERC20(cWheat).balanceOf(address(this));
        uint256 cSoyBalance = IERC20(cSoy).balanceOf(address(this));
        uint256 cRiceBalance = IERC20(cRice).balanceOf(address(this));
        uint256 cCornBalance = IERC20(cCorn).balanceOf(address(this));

        ERC20Burnable(cWheat).burn(cWheatBalance); //Sell cWheat
        _convertToXToken(xWheat); //Buy xWheat

        ERC20Burnable(cSoy).burn(cSoyBalance); //Sell cSoy
        _convertToXToken(xSoy); //Buy xSoy

        ERC20Burnable(cRice).burn(cRiceBalance); //Sell cRice
        _convertToXToken(xRice); //Buy xRice

        ERC20Burnable(cCorn).burn(cCornBalance); //Sell cCorn
        _convertToXToken(xCorn); //Buy xCorn

        uint256 xWheatBalance = IxToken(xWheat).balanceOf(address(this));
        uint256 xSoyBalance = IxToken(xSoy).balanceOf(address(this));
        uint256 xRiceBalance = IxToken(xRice).balanceOf(address(this));
        uint256 xCornBalance = IxToken(xCorn).balanceOf(address(this));
        IxToken(xWheat).stake(xWheatBalance);
        IxToken(xSoy).stake(xSoyBalance);
        IxToken(xRice).stake(xRiceBalance);
        IxToken(xCorn).stake(xCornBalance);

        emit AutoCompounded(xWheatBalance, xSoyBalance, xRiceBalance, xCornBalance);
    }

     function quoteAmountOut(uint _amount, address xToken) public view returns (uint) {
        uint price = twap.getPrice(usdc, xToken);
        uint256 amountOut = _amount * price / 1e6; //xTokens has 6 decimals
        return amountOut;
    }

    function _convertToXToken(address xToken) internal returns (uint256) {
        uint256 amountIn = IERC20(usdc).balanceOf(address(this));

        uint256 slippage =  keyProtocolValues.buyXTokenSlippage();
        uint256 predictedAmountOut = quoteAmountOut(amountIn, xToken);
        uint256 minAmountOut = predictedAmountOut * 10000 / (10000 + slippage);

        TransferHelper.safeApprove(usdc, address(uniswapRouter), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
        .ExactInputSingleParams(
            usdc,
            xToken,
            3000,
            address(this),
            block.timestamp + 15,
            amountIn,
            minAmountOut,
            0
        );
        return uniswapRouter.exactInputSingle(params);
    }

    function renounceOwnership() public view override onlyOwner {
        revert ("can 't renounceOwnership here");
    }

    function decimals()
        public
        view
        virtual
        override(ERC20, IERC20Metadata)
        returns (uint8)
    {
        return 6;
    }
}
