// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

interface ILandxNFT {
    function tillableArea(uint256 id) external view returns (uint256);

    function cropShare(uint256 id) external view returns (uint256);

    function crop(uint256 id) external view returns (string memory);

    function initialOwner(uint256 id) external view returns (address);

    function balanceOf(address account, uint256 id)
        external
        view
        returns (uint256);

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;
}

interface IXTokenRouter {
    function getXToken(string memory _name) external view returns (address);

    function getCToken(string memory _name) external view returns (address);
}

interface IRentFoundation {
    function initialRentApplied(uint256 tokenID) external view returns (bool);

    function payInitialRent(uint256 tokenID, uint256 amount) external;
}

interface ILNDX {
    function feeToDistribute(uint256 amount) external;
}

interface ICToken {
    function mint(address account, uint256 amount) external;
}

interface IOraclePrices {
    function prices(string memory grain) external pure returns (uint256);

    function getXTokenPrice(address xToken) external view returns (uint256);
}

interface IKeyProtocolValues {
    function xTokenMintFee() external pure returns (uint256);

    function securityDepositMonths() external pure returns (uint8);

    function xTokensSecurityWallet() external pure returns (address);

    function landxOperationalWallet() external pure returns (address);

    function landxChoiceWallet() external pure returns (address);

    function landXOpertationsPercentage() external pure returns (uint256);

    function landXChoicePercentage() external pure returns (uint256);

    function lndxHoldersPercentage() external pure returns (uint256);

    function hedgeFundAllocation() external pure returns (uint256);

    function hedgeFundWallet() external pure returns (address);

    function preLaunch() external pure returns (bool);
}

//xToken NFT in = shards. xToken in = NFT
//1 xToken = (tillableArea * cropShare) /  10000
contract XToken is Context, ERC20Permit, ERC20Burnable, Ownable, ERC1155Holder {
    string public constant crop = "CORN";
    address public xBasketContract;
    address public lndx;
    address public usdc;

    ILandxNFT public landXNFT; //address of landXNFT
    IXTokenRouter public xTokenRouter; // address of xTokenRouter
    IRentFoundation public rentFoundation;
    IOraclePrices public oraclePrices;
    IKeyProtocolValues public keyProtocolValues;

    ISwapRouter public uniswapRouter;

    //only the initial owner of the NFT can redeem it
    mapping(uint256 => address) public initialOwner;

    struct Stake {
        uint256 amount;
        uint256 startTime;
    }

    mapping(address => uint256) public Claimed;

    mapping(address => Stake) public Staked;
    mapping(address => uint256) public Yield;

    Stake public TotalStaked;
    uint256 public TotalYield;

    event Sharded(uint256 nftID, uint256 amount, string name);
    event BuyOut(uint256 nftID, uint256 amount, string name);

    constructor(
        address _landXNFT,
        address _lndx,
        address _usdc,
        address _rentFoundation,
        address _xTokenRouter,
        address _keyProtocolValues,
        address _uniswapRouter,
        address _oraclePrices,
        string memory _name // "xSOY, xCORN etc"
    ) ERC20Permit(_name) ERC20("LandX xToken", _name) {
        landXNFT = ILandxNFT(_landXNFT);
        lndx = _lndx;
        usdc = _usdc;
        rentFoundation = IRentFoundation(_rentFoundation);
        xTokenRouter = IXTokenRouter(_xTokenRouter);
        keyProtocolValues = IKeyProtocolValues(_keyProtocolValues);
        uniswapRouter = ISwapRouter(_uniswapRouter);
        oraclePrices = IOraclePrices(_oraclePrices);
    }

    //deposits an NFT to get shards equivalence
    function getShards(uint256 _id) external {
        require(
            landXNFT.tillableArea(_id) > 0,
            "this NFT has no land area set"
        );
        require(landXNFT.cropShare(_id) > 0, "this NFT has no crop share set");
        require(
            landXNFT.initialOwner(_id) == msg.sender,
            "only initial owner can shard"
        );
        require(
            keccak256(abi.encodePacked(landXNFT.crop(_id))) ==
                keccak256(abi.encodePacked(crop)),
            "wrong crop"
        );
        require(
            xTokenRouter.getXToken(crop) == address(this),
            "tokens are not set for this crop"
        );
        require(
            landXNFT.balanceOf(msg.sender, _id) > 0,
            "you must own this NFT"
        );

        require(
            rentFoundation.initialRentApplied(_id) == false,
            "rent was already applied"
        );

        initialOwner[_id] = msg.sender; //set the initial owner

        //transfers the nft. must have setApprovalForAll
        landXNFT.safeTransferFrom(msg.sender, address(this), _id, 1, "");

        uint256 shards = (landXNFT.tillableArea(_id) *
            (landXNFT.cropShare(_id)) *
            (10**uint256(6))) / 10000;
        _mint(address(this), shards);

        uint256 fee = _calcFee(shards);

        uint256 annualRent = getAnnualRentAmount(_id);
        uint256 xTokensAnnualRent = ((annualRent * oraclePrices.prices(crop)) /
            oraclePrices.getXTokenPrice(xTokenRouter.getXToken(crop))) * 1e3;
        uint256 toSecurityDepositsAmount = (xTokensAnnualRent / 12) *
            keyProtocolValues.securityDepositMonths();

        if (keyProtocolValues.preLaunch()) {
            _transfer(
                address(this),
                keyProtocolValues.landxOperationalWallet(),
                xTokensAnnualRent
            );
            _transfer(
                address(this),
                keyProtocolValues.landxOperationalWallet(),
                fee
            );
        } else {
            // transfer xTokens to securityDeposit
            uint256 usdcFee = convertToUsdc(fee);
            uint256 usdcAnnualRent = convertToUsdc(xTokensAnnualRent);
            uint256 toHedgeFund = (usdcAnnualRent *
                keyProtocolValues.hedgeFundAllocation()) / 10000;
            ERC20(usdc).transfer(
                keyProtocolValues.hedgeFundWallet(),
                toHedgeFund
            );
            ERC20(usdc).transfer(
                address(rentFoundation),
                usdcAnnualRent - toHedgeFund
            );
            feeDistributor(usdcFee);
        }
        _transfer(
            address(this),
            keyProtocolValues.xTokensSecurityWallet(),
            toSecurityDepositsAmount
        );
        _transfer(
            address(this),
            msg.sender,
            shards - fee - xTokensAnnualRent - toSecurityDepositsAmount
        );
        rentFoundation.payInitialRent(_id, annualRent);
        emit Sharded(_id, shards, symbol());
    }

    //returns the NFT after you deposit back the shards. requires allowance!
    function getTheNFT(uint256 _id) external {
        require(
            initialOwner[_id] == msg.sender,
            "only initial owner can redeem the NFT"
        );

        uint256 shards = (landXNFT.tillableArea(_id) *
            landXNFT.cropShare(_id) *
            (10**uint256(6))) / 10000;

        //burns shards!
        burn(shards);

        //transfer the NFTs
        landXNFT.safeTransferFrom(address(this), msg.sender, _id, 1, "");
        emit BuyOut(_id, shards, symbol());
    }

    function stake(uint256 amount) public {
        _transfer(msg.sender, address(this), amount);
        uint256 yield = calculateYield(Staked[msg.sender]);
        TotalYield += calculateTotalYield();
        Yield[msg.sender] += yield;
        Staked[msg.sender].startTime = block.timestamp;
        TotalStaked.startTime = block.timestamp;
        TotalStaked.amount += amount;
        Staked[msg.sender].amount += amount;
    }

    function unstake(uint256 amount) public {
        require(Staked[msg.sender].amount >= amount);
        _transfer(address(this), msg.sender, amount);
        claim();
        Staked[msg.sender].amount -= amount;
        TotalStaked.amount -= amount;
    }

    function claim() public {
        address cToken = xTokenRouter.getCToken(crop);
        uint256 yield = calculateYield(Staked[msg.sender]);
        TotalYield =
            TotalYield +
            calculateTotalYield() -
            (Yield[msg.sender] + yield);
        ICToken(cToken).mint(msg.sender, (Yield[msg.sender] + yield));
        Claimed[msg.sender] += (Yield[msg.sender] + yield);
        Staked[msg.sender].startTime = block.timestamp;
        TotalStaked.startTime = block.timestamp;
        Yield[msg.sender] = 0;
    }

    function feeDistributor(uint256 _fee) internal {
        uint256 lndxFee = (_fee * keyProtocolValues.lndxHoldersPercentage()) /
            10000;
        uint256 operationalFee = (_fee *
            keyProtocolValues.landXOpertationsPercentage()) / 10000;
        ERC20(usdc).transfer(lndx, lndxFee);
        ILNDX(lndx).feeToDistribute(lndxFee);
        ERC20(usdc).transfer(
            keyProtocolValues.landxOperationalWallet(),
            operationalFee
        );
        ERC20(usdc).transfer(
            keyProtocolValues.landxChoiceWallet(),
            _fee - lndxFee - operationalFee
        );
    }

    function availableToClaim(address account) public view returns (uint256) {
        return Yield[account] + calculateYield(Staked[account]);
    }

    function totalAvailableToClaim() public view returns (uint256) {
        return TotalYield + calculateTotalYield();
    }

    // calculate cTokanes amount generated since amount was staked
    function calculateYield(Stake storage s) internal view returns (uint256) {
        uint256 elapsedSeconds = block.timestamp - s.startTime;
        uint256 delimeter = 365 * 1 days;
        return (s.amount * elapsedSeconds) / delimeter;
    }

    function calculateTotalYield() internal view returns (uint256) {
        uint256 elapsedSeconds = block.timestamp - TotalStaked.startTime;
        uint256 delimeter = 365 * 1 days;
        return (TotalStaked.amount * elapsedSeconds) / delimeter;
    }

    function xBasketTransfer(address _from, uint256 amount) external {
        require(msg.sender == xBasketContract, "not authorized");
        _transfer(_from, xBasketContract, amount);
    }

    // change the address of landxNFT.
    function changeLandXNFTAddress(address _newAddress) public onlyOwner {
        landXNFT = ILandxNFT(_newAddress);
    }

    // change the address of xBasket.
    function changeXBasketAddress(address _newAddress) public onlyOwner {
        xBasketContract = _newAddress;
    }

    function setRentFoundation(address _address) public onlyOwner {
        rentFoundation = IRentFoundation(_address);
    }

    function setOraclePrices(address _oraclePrices) public onlyOwner {
        oraclePrices = IOraclePrices(_oraclePrices);
    }

    function _calcFee(uint256 amount) internal view returns (uint256) {
        uint256 fee = keyProtocolValues.xTokenMintFee();
        return (amount * fee) / 10000;
    }

    function setXTokenRouter(address _router) public onlyOwner {
        xTokenRouter = IXTokenRouter(_router);
    }

    // return annual rent amount in kg
    function getAnnualRentAmount(uint256 tokenID)
        public
        view
        returns (uint256)
    {
        uint256 rent = landXNFT.cropShare(tokenID);
        uint256 area = landXNFT.tillableArea(tokenID);

        return (rent * area) / 10000;
    }

    function convertToUsdc(uint256 amount) internal returns (uint256) {
        TransferHelper.safeApprove(
            address(this),
            address(uniswapRouter),
            amount
        );
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
        .ExactInputSingleParams(
            address(this),
            usdc,
            3000,
            address(this),
            block.timestamp + 15,
            amount,
            1,
            0
        );
        return uniswapRouter.exactInputSingle(params);
    }

    function preview(uint256 id)
        public
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        require(landXNFT.tillableArea(id) > 0, "this NFT has no land area set");
        require(landXNFT.cropShare(id) > 0, "this NFT has no crop share set");
        require(
            xTokenRouter.getXToken(landXNFT.crop(id)) == address(this),
            "Unable to shard this NFT"
        );
        uint256 shards = (landXNFT.tillableArea(id) *
            landXNFT.cropShare(id) *
            1e6) / 10000;
        uint256 annualRent = getAnnualRentAmount(id);
        uint256 xTokensAnnualRent = ((annualRent * oraclePrices.prices(crop)) /
            oraclePrices.getXTokenPrice(xTokenRouter.getXToken(crop))) * 1e3;
        uint256 toSecurityDepositsAmount = (xTokensAnnualRent / 12) *
            keyProtocolValues.securityDepositMonths();
        uint256 fee = _calcFee(shards);
        uint256 toBeReceived = shards -
            fee -
            xTokensAnnualRent -
            toSecurityDepositsAmount;
        return (
            shards,
            fee,
            xTokensAnnualRent + toSecurityDepositsAmount,
            toBeReceived
        );
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
