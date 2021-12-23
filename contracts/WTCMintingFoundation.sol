// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";


interface ILANDXNFT is IERC165 {
    function wtcCount(uint256 id) external view returns (uint256);
    function landOwner(uint256 id) external view returns (address);
}

interface IWTC is IERC165 {
    function mint(address to, uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface RENTFOUNDATION is IERC165 {
    function payInitialRentShards(uint256 tokenID, uint256 amount) external;
}


contract WTCMintingFoundation is 
    Context,
    Ownable,
    AccessControlEnumerable
{
    IWTC public wtc;

    RENTFOUNDATION public rentFoundation;
    address public stakingPool;

    ILANDXNFT public LANDXNFT;
    
    uint256 foundationPercentage = 4000; //40%
    uint256 stakingPercentage = 2000; //20%
    uint256 landOwnerPercentage = 2000; //20%
    uint256 investorPercentage = 2000; //20%

    uint256 landOwnerImmediatlyPercentage = 2000; //20%

    struct landOwnerBonus {
        uint256 immediattly;
        uint256 afterAction;
    }

    struct wtcMinted {
        uint256 toFoundation;
        uint256 toStaking;
        uint256 toLandOwner;
        uint256 toInvestor;
        landOwnerBonus landOwnerBonus;
        bool minted;
        bool fullDistributed;
    }

    mapping(uint256 => wtcMinted) public BonusMinted;

    bytes32 public constant BONUS_DISTRIBUTOR_ROLE = keccak256("BONUS_DISTRIBUTOR_ROLE");
    bytes32 public constant BONUS_MINTER_ROLE = keccak256("BONUS_MINTER_ROLE");


    constructor(address _wtc, address _address)
    {
		wtc = IWTC(_wtc);
        _setupRole(DEFAULT_ADMIN_ROLE, _address);
	}
    
    function mintBonus(uint256 tokenID, uint256 totalAmount) external {
        require(hasRole(BONUS_MINTER_ROLE, msg.sender), "not initial payer");
        require(address(rentFoundation) != address(0), "rentfoundation is not set");
        require((foundationPercentage + stakingPercentage + landOwnerPercentage + investorPercentage) <= 10000, "percentages sum > 100");
        if (BonusMinted[tokenID].minted == false) {
            uint256 toFoundation = _calcPercentage(totalAmount, foundationPercentage);
            uint256 toStaking = _calcPercentage(totalAmount, stakingPercentage);
            uint256 toLandOwner = _calcPercentage(totalAmount, landOwnerPercentage);
            uint256 toInvestor = _calcPercentage(totalAmount, investorPercentage);

            landOwnerBonus memory lob = landOwnerBonus(
                _calcPercentage(toLandOwner, landOwnerImmediatlyPercentage),
                _calcPercentage(toLandOwner, 10000  - landOwnerImmediatlyPercentage)
            );

            wtcMinted memory wm = wtcMinted(
                toFoundation,
                toStaking,
                toLandOwner,
                toInvestor,
                lob,
                true,
                false
            );

            BonusMinted[tokenID] = wm;

            wtc.mint(address(rentFoundation), toFoundation);
            wtc.mint(stakingPool, toStaking);
            wtc.mint(LANDXNFT.landOwner(tokenID), wm.landOwnerBonus.immediattly);
            wtc.mint(address(this), toInvestor + wm.landOwnerBonus.afterAction);
        }
    }

    function distributeAfterSell(uint256 tokenID, address to) external {
        require(BonusMinted[tokenID].fullDistributed != true, "Already distributed");
        require(hasRole(BONUS_DISTRIBUTOR_ROLE, msg.sender), "not distributor");
        require(wtc.transfer(to, BonusMinted[tokenID].toInvestor), "transfer failed");
        require(wtc.transfer(LANDXNFT.landOwner(tokenID), BonusMinted[tokenID].landOwnerBonus.afterAction), "transfer failed");
        BonusMinted[tokenID].fullDistributed = true;
    }
    
    function distributeAfterShard(uint256 tokenID, uint256 excludeAmount) external {
        require(BonusMinted[tokenID].fullDistributed != true, "Already distributed");
        require(hasRole(BONUS_DISTRIBUTOR_ROLE, msg.sender), "not distributor");
        require(wtc.transfer(address(rentFoundation), BonusMinted[tokenID].toInvestor), "transfer failed");
        if (BonusMinted[tokenID].landOwnerBonus.afterAction > excludeAmount) {
            require(wtc.transfer(LANDXNFT.landOwner(tokenID), BonusMinted[tokenID].landOwnerBonus.afterAction - excludeAmount), "transfer failed");
        }
         if (BonusMinted[tokenID].landOwnerBonus.afterAction <= excludeAmount) {
            excludeAmount = BonusMinted[tokenID].landOwnerBonus.afterAction;
        }
        require(wtc.approve(address(rentFoundation), excludeAmount), "Approvement failed");
        rentFoundation.payInitialRentShards(tokenID, excludeAmount);
        BonusMinted[tokenID].fullDistributed = true;
    }
    
    //owner can withdraw any token sent here. should be used with care
	function reclaimToken(IERC20 token, uint256 _amount) external onlyOwner {
		require(address(token) != address(0), "no 0 address");
		uint256 balance = token.balanceOf(address(this));
		require(_amount <= balance, "you can't withdraw more than you have");
		token.transfer(msg.sender, _amount);
	}

    //owner can withdraw any ETH sent here
	function withdraw() external onlyOwner {
		uint256 balance = address(this).balance;
		payable(msg.sender).transfer(balance);
	}

    /*function fullDistributed(uint256 tokenID) external view returns (bool) {
        return BonusMinted[tokenID].fullDistributed;
    }

    function forTokenMinted(uint256 tokenID) external view returns (bool) {
        return BonusMinted[tokenID].minted;
    }*/

    function _calcPercentage(uint256 amount, uint256 basisPoints) internal pure returns (uint256) {
		require(basisPoints >= 0);
		return (amount * basisPoints) / 10000;
	}

    function setRentFoundation(address _rentFoundation) public onlyOwner {
        rentFoundation = RENTFOUNDATION(_rentFoundation);
    }

    function setStakingPercentage(uint256 _percentage) public onlyOwner {
        require(_percentage > 0, "can't be negative");
        stakingPercentage = _percentage;
    }

    function setLandOwnerPercentage(uint256 _percentage) public onlyOwner {
        require(_percentage > 0, "can't be negative");
        landOwnerPercentage = _percentage;
    }

    function setLandOwnerImmediatlyPercentage(uint256 _percentage) public onlyOwner {
        require(_percentage > 0, "can't be negative");
        landOwnerImmediatlyPercentage = _percentage;
    }

    function setInvestorPercentage(uint256 _percentage) public onlyOwner {
        require(_percentage > 0, "can't be negative");
        investorPercentage = _percentage;
    }

    function setLandXNFT (address _landXNFT) public onlyOwner {
        LANDXNFT = ILANDXNFT(_landXNFT);
    }

    function setStakingPool(address _stakingPool) public onlyOwner {
        stakingPool = _stakingPool;
    }
}