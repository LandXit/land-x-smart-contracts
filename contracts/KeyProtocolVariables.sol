//SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";

contract KeyProtocolVariables is Ownable {
    address public dao;

    bool public preLaunch = true;

    //Commisions
    uint256 public xTokenMintFee = 300; // 3%
    uint256 public cTokenSellFee = 1000; // 10%
    uint256 public payRentFee = 150; // 1.5%

    uint256 public validatorCommission = 25; // 0.25%

    mapping(string => uint256) public maxAllowableCropShare;

    uint256 public hedgeFundAllocation = 1500; //15%
    uint8 public securityDepositMonths = 12; // 12 months

    uint256 public landXOpertationsPercentage = 3000;
    uint256 public landXChoicePercentage = 500;
    uint256 public lndxHoldersPercentage = 6500;

    // Wallets
    address public hedgeFundWallet;
    address public landxOperationalWallet;
    address public landxChoiceWallet;
    address public xTokensSecurityWallet;
    address public validatorCommisionWallet;

    constructor(
        address _dao,
        address _hedgeFundWallet,
        address _landxOperationalWallet,
        address _landxChoiceWallet,
        address _xTokensSecurityWallet,
        address _validatorCommisionWallet
    ) {
        dao = _dao;
        maxAllowableCropShare["SOY"] = 1200;
        maxAllowableCropShare["WHEAT"] = 1200;
        maxAllowableCropShare["RICE"] = 1200;
        maxAllowableCropShare["CORN"] = 1200;

        hedgeFundWallet = _hedgeFundWallet;
        landxOperationalWallet = _landxOperationalWallet;
        landxChoiceWallet = _landxChoiceWallet;
        xTokensSecurityWallet = _xTokensSecurityWallet;
        validatorCommisionWallet = _validatorCommisionWallet;
    }

    function updateXTokenMintFee(uint256 _fee) public {
        require(msg.sender == dao, "only dao can change value");
        xTokenMintFee = _fee;
    }

    function updateCTokenSellFee(uint256 _fee) public {
        require(msg.sender == dao, "only dao can change value");
        cTokenSellFee = _fee;
    }

    function updatePayRentFee(uint256 _fee) public {
        require(msg.sender == dao, "only dao can change value");
        payRentFee = _fee;
    }

    function updateMaxAllowableCropShare(string memory _crop, uint256 _macs)
        public
    {
        require(msg.sender == dao, "only dao can change value");
        maxAllowableCropShare[_crop] = _macs;
    }

    function updateHedgeFundAllocation(uint256 _allocation) public {
        require(msg.sender == dao, "only dao can change value");
        hedgeFundAllocation = _allocation;
    }

    function updateSecurityDepositMonths(uint8 _months) public {
        require(msg.sender == dao, "only dao can change value");
        securityDepositMonths = _months;
    }

    function updateFeeDistributionPercentage(
        uint256 _lndxHoldersPercentage,
        uint256 _landxOperationPercentage
    ) public {
        require(msg.sender == dao, "only dao can change value");
        require(
            (_lndxHoldersPercentage + _landxOperationPercentage) < 10000,
            "inconsistent values"
        );
        lndxHoldersPercentage = _lndxHoldersPercentage;
        landXOpertationsPercentage = _landxOperationPercentage;
        landXChoicePercentage =
            10000 -
            lndxHoldersPercentage -
            landXOpertationsPercentage;
    }

    function updateHedgeFundWallet(address _wallet) public {
        require(msg.sender == dao, "only dao can change value");
        hedgeFundWallet = _wallet;
    }

    function updateLandxOperationalWallet(address _wallet) public {
        require(msg.sender == dao, "only dao can change value");
        landxOperationalWallet = _wallet;
    }

    function updateLandxChoiceWallet(address _wallet) public {
        require(msg.sender == dao, "only dao can change value");
        landxChoiceWallet = _wallet;
    }

    function updateXTokensSecurityWallet(address _wallet) public {
        require(msg.sender == dao, "only dao can change value");
        xTokensSecurityWallet = _wallet;
    }

    function updateValidatorCommisionWallet(address _wallet) public {
        require(msg.sender == dao, "only dao can change value");
        validatorCommisionWallet = _wallet;
    }

    function launch() public {
        require(msg.sender == dao, "only dao can change value");
        preLaunch = false;
    }

    function renounceOwnership() public override onlyOwner {
        revert ("can 't renounceOwnership here");
    }
}
