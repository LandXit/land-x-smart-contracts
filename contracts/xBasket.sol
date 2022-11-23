// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

interface IxTokenRouter {
    function getCToken(string memory _name) external view returns (address);

    function getXToken(string memory _name) external view returns (address);
}

interface IOraclePrices {
    function getXTokenPrice(address xToken) external view returns (uint256);

    function prices(string memory) external view returns (uint256);

    function usdc() external view returns (address);
}

interface IXToken is IERC20 {
    function stake(uint256 amount) external;

    function unstake(uint256 amount) external;

    function xBasketTransfer(address _from, uint256 amount) external;

    function Staked(address)
        external
        view
        returns (uint256 amount, uint256 startTime); // Not

    function availableToClaim(address account) external view returns (uint256);

    function claim() external;
}

contract xBasket is ERC20, IERC4626, Ownable {
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

    ISwapRouter public uniswapRouter;

    constructor(
        address _xTokenRouter,
        address _oraclePrices,
        address _uniswapRouter
    ) ERC20("xBasket LandX Index Fund", "xBASKET") {
        require(_xTokenRouter != address(0), "zero address is not allowed");
        require(_oraclePrices != address(0), "zero address is not allowed");
        require(_uniswapRouter != address(0), "zero address is not allowed");
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
        uniswapRouter = ISwapRouter(_uniswapRouter);
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
            shares = assets; // initially 1 xBasket = 0.25 of all 4 xTokens
        } else {
            shares = (assets * circulatingSupply) / usdVaultValuation;
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
            return shares;
        }
        uint256 redeemAmount = (shares * usdVaultValuation) / circulatingSupply;
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
        uint256 xWheatBalance = IXToken(xWheat).balanceOf(owner);
        uint256 xSoyBalance = IXToken(xSoy).balanceOf(owner);
        uint256 xRiceBalance = IXToken(xRice).balanceOf(owner);
        uint256 xCornBalance = IXToken(xCorn).balanceOf(owner);
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
        IXToken(xWheat).xBasketTransfer(caller, assets);
        IXToken(xSoy).xBasketTransfer(caller, assets);
        IXToken(xRice).xBasketTransfer(caller, assets);
        IXToken(xCorn).xBasketTransfer(caller, assets);
        IXToken(xWheat).stake(assets);
        IXToken(xSoy).stake(assets);
        IXToken(xRice).stake(assets);
        IXToken(xCorn).stake(assets);
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
        IXToken(xWheat).unstake(assets);
        IXToken(xSoy).unstake(assets);
        IXToken(xRice).unstake(assets);
        IXToken(xCorn).unstake(assets);
        IXToken(xWheat).transfer(receiver, assets);
        IXToken(xSoy).transfer(receiver, assets);
        IXToken(xRice).transfer(receiver, assets);
        IXToken(xCorn).transfer(receiver, assets);
        emit Withdraw(caller, receiver, owner, assets, shares);
    }

    // calculate the value of the contracts xToken holdings in USDC
    function calculateCollateral() public view returns (uint256) {
        // xTokens Balances
        uint256 xWheatBalance = IXToken(xWheat).balanceOf(address(this));
        uint256 xSoyBalance = IXToken(xSoy).balanceOf(address(this));
        uint256 xRiceBalance = IXToken(xRice).balanceOf(address(this));
        uint256 xCornBalance = IXToken(xCorn).balanceOf(address(this));

        (uint256 xWheatStaked, ) = IXToken(xWheat).Staked(address(this));
        (uint256 xSoyStaked, ) = IXToken(xSoy).Staked(address(this));
        (uint256 xRiceStaked, ) = IXToken(xRice).Staked(address(this));
        (uint256 xCornStaked, ) = IXToken(xCorn).Staked(address(this));

        // USDC Prices - Note this assumes prices are stored in USDC with 6 decimals
        uint256 xWheatPrice = oraclePrices.getXTokenPrice(xWheat);
        uint256 xSoyPrice = oraclePrices.getXTokenPrice(xSoy);
        uint256 xRicePrice = oraclePrices.getXTokenPrice(xRice);
        uint256 xCornPrice = oraclePrices.getXTokenPrice(xCorn);

        // Valutations
        uint256 collateral;
        collateral += ((xWheatBalance + xWheatStaked) * xWheatPrice) / 1e6;
        collateral += ((xSoyBalance + xSoyStaked) * xSoyPrice) / 1e6;
        collateral += ((xRiceBalance + xRiceStaked) * xRicePrice) / 1e6;
        collateral += ((xCornBalance + xCornStaked) * xCornPrice) / 1e6;
        return collateral;
    }

    // calculate the value of the contracts cToken holdings in USDC
    function calculateYield() public view returns (uint256) {
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
        totalYield +=
            ((IERC20(cWheat).balanceOf(address(this)) + cWheatPending) *
                cWheatPrice) /
            1e9;
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
        uint256 xBasketPrice = (tvl * 1e6) / circulatingSupply; // price is usdc (6 decimals) for 1 xBasket
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

        ERC20Burnable(cWheat).burn(cWheatBalance); //Sell cWheat
        convertToXToken(xWheat); //Buy xWheat

        ERC20Burnable(cSoy).burn(cSoyBalance); //Sell cSoy
        convertToXToken(xSoy); //Buy xSoy

        ERC20Burnable(cRice).burn(cRiceBalance); //Sell cRice
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

    function convertToXToken(address xToken) internal returns (uint256) {
        uint256 amountIn = IERC20(usdc).balanceOf(address(this));
        TransferHelper.safeApprove(usdc, address(uniswapRouter), amountIn);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
        .ExactInputSingleParams(
            usdc,
            xToken,
            3000,
            address(this),
            block.timestamp + 15,
            amountIn,
            1,
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
