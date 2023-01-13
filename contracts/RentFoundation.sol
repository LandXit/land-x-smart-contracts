// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./interfaces/IKeyProtocolVariables.sol";
import "./interfaces/ILandXNFT.sol";
import "./interfaces/IxTokenRouter.sol";
import "./interfaces/IOraclePrices.sol";
import "./interfaces/IRentFoundation.sol";
import "./interfaces/IcToken.sol";
import "./interfaces/IxToken.sol";
import "./interfaces/ILNDX.sol";

contract RentFoundation is IRentFoundation, Context, Ownable {
    struct deposit {
        uint256 timestamp;
        uint256 amount; // in kg
        int256 depositBalance; //in kg
    }

    IERC20 public immutable usdc;

    address public immutable lndx;

    ILandXNFT public landXNFT; //address of landXNFT

    IOraclePrices public grainPrices;

    IxTokenRouter public xTokenRouter; // address of xTokenRouter
    IKeyProtocolVariables public keyProtocolValues;

    mapping(uint256 => deposit) public deposits;

    mapping(uint256 => bool) public initialRentApplied;

    mapping(uint256 => bool) public spentSecurityDeposit;

    address public distributor;
    string[] public crops = ["SOY", "WHEAT", "CORN", "RICE"];

    event rentPaid(uint256 tokenID, uint256 amount);
    event initialRentPaid(uint256 tokenID, uint256 amount);

    constructor(
        address _usdc,
        address _lndx,
        address _grainPrices,
        address _landXNFT,
        address _xTokenRouter,
        address _keyProtocolValues,
        address _distributor
    ) {
        require(_usdc != address(0), "zero address is not allowed");
        require(_lndx != address(0), "zero address is not allowed");
        require(_grainPrices != address(0), "zero address is not allowed");
        require(_landXNFT != address(0), "zero address is not allowed");
        require(_xTokenRouter!= address(0), "zero address is not allowed");
        require(_keyProtocolValues != address(0), "zero address is not allowed");
        usdc = IERC20(_usdc);
        lndx = _lndx;
        xTokenRouter = IxTokenRouter(_xTokenRouter);
        grainPrices = IOraclePrices(_grainPrices);
        landXNFT = ILandXNFT(_landXNFT);
        keyProtocolValues = IKeyProtocolVariables(_keyProtocolValues);
        distributor = _distributor;
    }

    // deposit rent for token ID, in USDC
    function payRent(uint256 tokenID, uint256 amount) public {
        require(initialRentApplied[tokenID], "Initial rent was not applied");
        if (msg.sender == keyProtocolValues.xTokensSecurityWallet()) {
            require(!spentSecurityDeposit[tokenID], "securityDeposit is already spent");
            spentSecurityDeposit[tokenID] = true;
        }
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "transfer failed"
        );
        uint256 platformFee = (amount * keyProtocolValues.payRentFee()) / 10000; // 100% = 10000
        uint256 validatorFee = (amount *
            keyProtocolValues.validatorCommission()) / 10000; // 100% = 10000
        usdc.transfer(
            keyProtocolValues.hedgeFundWallet(),
            ((amount - platformFee - validatorFee) *
                keyProtocolValues.hedgeFundAllocation()) / 10000 // 100% = 10000
        );
        usdc.transfer(
            keyProtocolValues.validatorCommisionWallet(),
            validatorFee
        );
        uint256 grainAmount = (amount - platformFee - validatorFee) * 10 ** 3 / //grainPrices.prices returns price per megatonne, so to get amount in KG we multiply by 10 ** 3 
            grainPrices.prices(landXNFT.crop(tokenID));
        _feeDistributor(platformFee);
        deposits[tokenID].amount += grainAmount;
        emit rentPaid(tokenID, grainAmount);
    }

    // prepay initial rent after sharding in kg
    function payInitialRent(uint256 tokenID, uint256 amount) external {
        string memory crop = landXNFT.crop(tokenID);
        require(
            !initialRentApplied[tokenID],
            "Initial Paymant already applied"
        );
        require(
            xTokenRouter.getXToken(crop) == msg.sender,
            "not initial payer"
        );
        deposits[tokenID].timestamp = block.timestamp;
        deposits[tokenID].amount = amount;
        initialRentApplied[tokenID] = true;
        spentSecurityDeposit[tokenID] = false;
        emit initialRentPaid(tokenID, amount);
    }

    function getDepositBalance(uint256 tokenID) public view returns (int256) {
        uint256 elapsedSeconds = block.timestamp - deposits[tokenID].timestamp;
        uint256 delimeter = 365 * 1 days;
        uint256 rentPerSecond = (landXNFT.cropShare(tokenID) *
            landXNFT.tillableArea(tokenID) * 10 ** 3) /  delimeter; // multiply by 10**3 to not loose precision
        return
            int256(deposits[tokenID].amount) -
            int256(rentPerSecond * elapsedSeconds / 10 ** 7); // landXNFT.tillableArea returns area in square meters(so we divide by 10 ** 4 to get Ha) and diivide by 10 ** 3 from previous step
    }

    // Check and return remainig rent paid
    function buyOut(uint256 tokenID) external returns(uint256) {
        string memory crop = landXNFT.crop(tokenID);
        require(
            initialRentApplied[tokenID],
            "Initial Paymant isn't applied"
        );
        require(
            xTokenRouter.getXToken(crop) == msg.sender,
            "not initial payer"
        );

        int256 depositBalance = getDepositBalance(tokenID);  //KG

        if (depositBalance < 0) {
            revert("NFT has a debt");
        }

        uint256 usdcAmount = (uint256(depositBalance) * grainPrices.prices(crop)) / (10**3); // price per megatonne and usdc has 6 decimals (10**6 / 10**9)


        deposits[tokenID].depositBalance = 0;
        deposits[tokenID].amount = 0;
        deposits[tokenID].timestamp = 0;
        initialRentApplied[tokenID] = false;

        usdc.transfer(msg.sender, usdcAmount);
        return usdcAmount;
    }

     function buyOutPreview(uint256 tokenID) external view returns(bool, uint256) {
        string memory crop = landXNFT.crop(tokenID);
        require(
            initialRentApplied[tokenID],
            "Initial Paymant isn't applied"
        );
        require(
            xTokenRouter.getXToken(crop) == msg.sender,
            "not initial payer"
        );

        int256 depositBalance = getDepositBalance(tokenID);  //KG

        if (depositBalance < 0) {
            return (false, 0);
        }

        uint256 usdcAmount = (uint256(depositBalance) * grainPrices.prices(crop)) / (10**3); // price per megatonne and usdc has 6 decimals (10**6 / 10**9)

        return (true, usdcAmount);
    }

    function sellCToken(address account, uint256 amount) public {
        string memory crop = IcToken(msg.sender).crop();
        require(xTokenRouter.getCToken(crop) == msg.sender, "no valid cToken");
        uint256 usdcAmount = (amount * grainPrices.prices(crop)) / (10**9);
        uint256 sellTokenFee = (usdcAmount *
            keyProtocolValues.cTokenSellFee()) / 10000; // 100% = 10000
        usdc.transfer(account, usdcAmount - sellTokenFee);
        _feeDistributor(sellTokenFee);
    }

    function _feeDistributor(uint256 _fee) internal {
        uint256 lndxFee = (_fee * keyProtocolValues.lndxHoldersPercentage()) /
            10000;
        uint256 operationalFee = (_fee *
            keyProtocolValues.landXOperationsPercentage()) / 10000; // 100% = 10000
        usdc.transfer(lndx, lndxFee);
        ILNDX(lndx).feeToDistribute(lndxFee);
        usdc.transfer(
            keyProtocolValues.landxOperationalWallet(),
            operationalFee
        );
        usdc.transfer(
            keyProtocolValues.landxChoiceWallet(),
            _fee - lndxFee - operationalFee
        );
    }

     function previewSurplusUSDC() public view returns(uint256) {
        uint256 totalUsdcYield;
        for (uint i=0; i<crops.length; i++) {
            address xTokenAddress = xTokenRouter.getXToken(crops[i]);
            uint amount = IxToken(xTokenAddress).previewNonDistributedYield();
            uint usdcYield = (amount * grainPrices.prices(crops[i])) / (10**9);
            totalUsdcYield += usdcYield;
        }
        return totalUsdcYield;
    }

     function _getSurplusUSDC() internal returns(uint256) {
        uint totalUsdcYield;
        for (uint i=0; i<crops.length; i++) {
            address xTokenAddress = xTokenRouter.getXToken(crops[i]);
            uint amount = IxToken(xTokenAddress).getNonDistributedYield();
            uint usdcYield = (amount * grainPrices.prices(crops[i])) / (10**9);
            totalUsdcYield += usdcYield;
        }
        return totalUsdcYield;
    }

    function withdrawSurplusUSDC(uint _amount) public {
        require(msg.sender == distributor, "only distributor can withdraw");
        require(_getSurplusUSDC() >= _amount && _amount < usdc.balanceOf(address(this)), "not enough surplus funds");
        usdc.transfer(distributor, _amount);
    }

    function updateDistributor(address _distributor) public onlyOwner {
        distributor = _distributor;
    }

    function updateCrops(string[] memory _crops) public onlyOwner {
        crops = _crops;
    }

    function setXTokenRouter(address _router) public onlyOwner {
        require(_router != address(0), "zero address is not allowed");
        xTokenRouter = IxTokenRouter(_router);
    }

    function setGrainPrices(address _grainPrices) public onlyOwner {
        require(_grainPrices != address(0), "zero address is not allowed");
        grainPrices = IOraclePrices(_grainPrices);
    }

    // change the address of landxNFT.
    function changeLandXNFTAddress(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "zero address is not allowed");
        landXNFT = ILandXNFT(_newAddress);
    }

    function renounceOwnership() public view override onlyOwner {
        revert ("can 't renounceOwnership here");
    }
}
