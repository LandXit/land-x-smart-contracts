// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";

interface ILANDXNFT {
    function tillableArea(uint256 id) external view returns (uint256);

    function cropShare(uint256 id) external view returns (uint256);

    function crop(uint256 id) external view returns (string memory);
}

interface ILNDX {
    function feeToDistribute(uint256 amount) external;
}

interface IXTOKENROUTER {
    function getXToken(string memory _name) external view returns (address);

    function getCToken(string memory _name) external view returns (address);
}

interface IGRAINPRICES {
    function prices(string memory grain) external pure returns (uint256);
}

interface ICrop {
    function crop() external pure returns (string memory);
}

interface IKEYPROTOCOLVALUES {
    function landxOperationalWallet() external pure returns (address);

    function landxChoiceWallet() external pure returns (address);

    function landXOpertationsPercentage() external pure returns (uint256);

    function landXChoicePercentage() external pure returns (uint256);

    function lndxHoldersPercentage() external pure returns (uint256);

    function hedgeFundAllocation() external pure returns (uint256);

    function hedgeFundWallet() external pure returns (address);

    function cTokenSellFee() external pure returns (uint256);

    function validatorCommission() external pure returns (uint256);

    function validatorCommisionWallet() external pure returns (address);

    function payRentFee() external pure returns (uint256);
}

contract RentFoundation is Context, Ownable {
    IERC20 public usdc;

    address public lndx;

    ILANDXNFT public landXNFT; //address of landXNFT

    IGRAINPRICES public grainPrices;

    IXTOKENROUTER public xTokenRouter; // address of xTokenRouter
    IKEYPROTOCOLVALUES public keyProtocolValues;

    event rentPaid(uint256 tokenID, uint256 amount);
    event initialRentPaid(uint256 tokenID, uint256 amount);

    struct deposit {
        uint256 timestamp;
        uint256 amount; // in kg
        int256 depositBalance; //in kg
    }

    mapping(uint256 => deposit) public deposits;

    mapping(uint256 => bool) public initialRentApplied;

    constructor(
        address _usdc,
        address _lndx,
        address _keyProtokolValues
    ) {
        usdc = IERC20(_usdc);
        lndx = _lndx;
        keyProtocolValues = IKEYPROTOCOLVALUES(_keyProtokolValues);
    }

    // deposit rent for token ID, in USDC
    function payRent(uint256 tokenID, uint256 amount) public {
        require(initialRentApplied[tokenID], "Initial rent was not applied");
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "transfer failed"
        );
        uint256 platformFee = (amount * keyProtocolValues.payRentFee()) / 10000;
        uint256 validatorFee = (amount *
            keyProtocolValues.validatorCommission()) / 10000;
        usdc.transfer(
            keyProtocolValues.hedgeFundWallet(),
            ((amount - platformFee - validatorFee) *
                keyProtocolValues.hedgeFundAllocation()) / 10000
        );
        usdc.transfer(
            keyProtocolValues.validatorCommisionWallet(),
            validatorFee
        );
        uint256 grainAmount = (amount - platformFee - validatorFee) * 10 ** 3 /
            grainPrices.prices(landXNFT.crop(tokenID));
        feeDistributor(platformFee);
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
        emit initialRentPaid(tokenID, amount);
    }

    function getDepositBalance(uint256 tokenID) public view returns (int256) {
        uint256 elapsedSeconds = block.timestamp - deposits[tokenID].timestamp;
        uint256 delimeter = 365 * 1 days;
        uint256 rentPerSecond = (landXNFT.cropShare(tokenID) *
            landXNFT.tillableArea(tokenID) * 10 ** 3) /  delimeter;
        return
            int256(deposits[tokenID].amount) -
            int256(rentPerSecond * elapsedSeconds / 10 ** 7);
    }

    function sellCToken(address account, uint256 amount) public {
        string memory crop = ICrop(msg.sender).crop();
        require(xTokenRouter.getCToken(crop) == msg.sender, "no valid cToken");
        uint256 usdcAmount = (amount * grainPrices.prices(crop)) / (10**9);
        uint256 cellTokenFee = (usdcAmount *
            keyProtocolValues.cTokenSellFee()) / 10000;
        usdc.transfer(account, usdcAmount - cellTokenFee);
        feeDistributor(cellTokenFee);
    }

    function feeDistributor(uint256 _fee) internal {
        uint256 lndxFee = (_fee * keyProtocolValues.lndxHoldersPercentage()) /
            10000;
        uint256 operationalFee = (_fee *
            keyProtocolValues.landXOpertationsPercentage()) / 10000;
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

    function setXTokenRouter(address _router) public onlyOwner {
        xTokenRouter = IXTOKENROUTER(_router);
    }

    function setGrainPrices(address _grainPrices) public onlyOwner {
        grainPrices = IGRAINPRICES(_grainPrices);
    }

    // change the address of landxNFT.
    function changeLandXNFTAddress(address _newAddress) public onlyOwner {
        landXNFT = ILANDXNFT(_newAddress);
    }

    function renounceOwnership() public override onlyOwner {
        revert ("can 't renounceOwnership here");
    }
}
