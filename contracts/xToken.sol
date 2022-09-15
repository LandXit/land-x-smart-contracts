// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

interface ILANDXNFT {
    function landArea(uint256 id) external view returns (uint256);
    function rent(uint256 id) external view returns (uint256);
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

interface IXTOKENROUTER {
    function getXToken(string memory _name) external view returns(address);
    function getCToken(string memory _name) external view returns(address);
}

interface IRENTFOUNDATION {
    function initialRentApplied(uint256 tokenID) external view returns(bool);
    function payInitialRent(uint256 tokenID, uint256 amount) external;
}

interface ICTOKEN {
    function mint(address account, uint256 amount) external;
}

interface IGRAINPRICES {
	function prices(string memory grain) external pure returns(uint256);
    function getXTokenPrice(address xToken) external view returns(uint256);
}

interface IKEYPROTOKOLVALUES {
    function xTokenMintFee() external pure returns(uint256);
    function securityDepositMonths() external pure returns(uint8);
    function xTokensSecurityWallet() external pure returns(address);
    function landxOperationalWallet() external pure returns(address);
    function landxChoiceWallet() external pure returns(address);
    function landXOpertationsPercentage() external pure returns(uint256);
    function landXChoicePercentage() external pure returns(uint256);
    function lndxHoldersPercentage() external pure returns(uint256);
    function hedgeFundAllocation() external pure returns(uint256);
    function hedgeFundWallet() external pure returns (address);
    function preLaunch() external pure returns(bool);
}

//xToken NFT in = shards. xToken in = NFT
//1 xToken = (landArea * rent) /  10000
contract XToken is
    Context,
    ERC20Permit,
    ERC20Burnable,
    Ownable,
    ERC1155Holder
{
    string public constant crop = "CORN";
    address public xBasketContract;
    address public lndx;
    address public usdc;

    ILANDXNFT public landXNFT; //address of landXNFT
    IXTOKENROUTER public xTokenRouter; // address of xTokenRouter
    IRENTFOUNDATION public rentFoundation;
    IGRAINPRICES public grainPrices;
    IKEYPROTOKOLVALUES public keyProtocolValues;

    ISwapRouter public constant uniswapRouter = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    //only the initial owner of the NFT can redeem it
    mapping(uint256 => address) public initialOwner;

    struct Stake {
        uint256 amount;
        uint256 startTime;
    }

    mapping (address => uint256) public Claimed;

    mapping(address => Stake) public Staked;
    mapping(address => uint256) public Yield;

    Stake public TotalStaked;
    uint256 public TotalYield;

    event Sharded(uint256 nftID, uint256 amount, string name);
    event BuyOut(uint256 nftID, uint256 amount, string name);

    constructor(address _landXNFT, address _lndx, address _usdc, address _rentFoundation, address _xTokenRouter, address _keyProtocolValues)
        ERC20Permit("xCORN")
        ERC20("LandX xToken", "xCORN")
    {
        landXNFT = ILANDXNFT(_landXNFT);
        lndx = _lndx;
        usdc = _usdc;
        rentFoundation = IRENTFOUNDATION(_rentFoundation);
        xTokenRouter = IXTOKENROUTER(_xTokenRouter);
        keyProtocolValues = IKEYPROTOKOLVALUES(_keyProtocolValues);
    }

    //deposits an NFT to get shards equivalence
    function getShards(uint256 _id) external {
        require(landXNFT.landArea(_id) > 0, "this NFT has no land area set");
        require(landXNFT.rent(_id) > 0, "this NFT has no rent set");
        require(landXNFT.initialOwner(_id) == msg.sender, "only initial owner can shard");
        require(keccak256(abi.encodePacked(landXNFT.crop(_id))) == keccak256(abi.encodePacked(crop)), "wrong crop");
        require(xTokenRouter.getXToken(crop) == address(this), "tokens are not set for this crop");
        require(
            landXNFT.balanceOf(msg.sender, _id) > 0,
            "you must own this NFT"
        );

        initialOwner[_id] = msg.sender; //set the initial owner

        //transfers the nft. must have setApprovalForAll
        landXNFT.safeTransferFrom(msg.sender, address(this), _id, 1, "");

        uint256 shards = landXNFT.landArea(_id) * (landXNFT.rent(_id)) * (10**uint256(6)) / 10000;
        _mint(address(this), shards);

        uint256 fee = _calcFee(shards);

        uint256 annualRent = getAnnualRentAmount(_id);
        uint256 xTokensAnnualRent = annualRent * grainPrices.prices(crop) * grainPrices.getXTokenPrice(xTokenRouter.getXToken(crop)) / (1e6 * 1e9);
        uint256 toSecurityDepositsAmount = (annualRent / 12  * keyProtocolValues.securityDepositMonths()) * grainPrices.prices(crop) * grainPrices.getXTokenPrice(xTokenRouter.getXToken(crop)) / (1e6 * 1e9);
      
        if (keyProtocolValues.preLaunch()) {
            _transfer(address(this), keyProtocolValues.landxOperationalWallet(), xTokensAnnualRent);
            _transfer(address(this), keyProtocolValues.landxOperationalWallet(), fee);
        } else {
              // transfer xTokens to securityDeposit
            uint256 usdcFee = convertToUsdc(fee);
            uint256 usdcAnnualRent = convertToUsdc(xTokensAnnualRent);
            uint256 toHedgeFund = usdcAnnualRent * keyProtocolValues.hedgeFundAllocation() / 10000;
            ERC20(usdc).transfer(keyProtocolValues.hedgeFundWallet(), toHedgeFund);
            ERC20(usdc).transfer(address(rentFoundation), usdcAnnualRent - toHedgeFund);
            feeDistributor(usdcFee);
        }
         _transfer(address(this), keyProtocolValues.xTokensSecurityWallet(), toSecurityDepositsAmount);
         _transfer(address(this), msg.sender, shards - fee - xTokensAnnualRent - toSecurityDepositsAmount);
         rentFoundation.payInitialRent(_id, annualRent);

        if (landXNFT.initialOwner(_id) != msg.sender && !rentFoundation.initialRentApplied(_id)) {
            revert("Cannot shard token by not landowner without initial rent applied");
        }
        
        emit Sharded(_id, shards, symbol());
    }

    //returns the NFT after you deposit back the shards. requires allowance!
    function getTheNFT(uint256 _id) external {
        require(
            initialOwner[_id] == msg.sender,
            "only initial owner can redeem the NFT"
        );

        uint256 shards = landXNFT.landArea(_id) * landXNFT.rent(_id)  * (10**uint256(6)) / 10000;

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
        TotalYield = TotalYield + calculateTotalYield() - (Yield[msg.sender] + yield);
        ICTOKEN(cToken).mint(msg.sender,  (Yield[msg.sender] + yield));
        Claimed[msg.sender] += (Yield[msg.sender] + yield);
        Staked[msg.sender].startTime = block.timestamp;
        TotalStaked.startTime = block.timestamp;
        Yield[msg.sender] = 0;
    }

    function feeDistributor(uint256 _fee) internal {
        uint256 lndxFee = _fee * keyProtocolValues.lndxHoldersPercentage() / 10000;
        uint256 operationalFee = _fee * keyProtocolValues.landXOpertationsPercentage() / 10000;
        ERC20(usdc).transfer(lndx, lndxFee);
        ERC20(usdc).transfer(keyProtocolValues.landxOperationalWallet(), operationalFee);
        ERC20(usdc).transfer(keyProtocolValues.landxChoiceWallet(),_fee - lndxFee -operationalFee);
    } 

    function availableToClaim(address account) public view returns(uint256) {
        return Yield[account] + calculateYield(Staked[account]);
    }

    function totalAvailableToClaim() public view returns (uint256) {
        return TotalYield + calculateTotalYield();
    }

    // calculate cTokanes amount generated since amount was staked
    function calculateYield(Stake storage s) view internal returns (uint256){
        uint256 elapsedSeconds = block.timestamp - s.startTime;
        uint256 delimeter = 365 * 1 days;
        return (s.amount * elapsedSeconds) / delimeter; 
    }

    function calculateTotalYield() view internal returns (uint256) {
        uint256 elapsedSeconds = block.timestamp - TotalStaked.startTime;
        uint256 delimeter = 365 * 1 days;
        return (TotalStaked.amount * elapsedSeconds) / delimeter; 
    }

    function xBasketTransfer(address _from, uint256 amount) external {
        require(msg.sender == xBasketContract,"not authorized");
        _transfer(_from, xBasketContract, amount);
    }

    // change the address of landxNFT.
    function changeLandXNFTAddress(address _newAddress) public onlyOwner {
        landXNFT = ILANDXNFT(_newAddress);
    }

    // change the address of xBasket.
    function changeXBasketAddress(address _newAddress) public onlyOwner {
        xBasketContract = _newAddress;
    }

    function setRentFoundation(address _address) public onlyOwner {
        rentFoundation = IRENTFOUNDATION(_address);
    }

    function setGrainPrices(address _grainPrices) public onlyOwner {
        grainPrices = IGRAINPRICES(_grainPrices);
    }

    function _calcFee(uint256 amount) internal view returns (uint256) {
        uint256 fee = keyProtocolValues.xTokenMintFee();
		return (amount * fee) / 10000;
	}

    function setXTokenRouter(address _router) public onlyOwner {
        xTokenRouter = IXTOKENROUTER(_router);
    }

    // return annual rent amount in kg
    function getAnnualRentAmount(uint256 tokenID) public view returns (uint256)
	{
		uint256 rent = landXNFT.rent(tokenID);
		uint256 area = landXNFT.landArea(tokenID);

		return (rent * area) / 10000;
	}

    function convertToUsdc(uint256 amount) internal returns(uint256) {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams(
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

    function preview(uint256 id) public view returns(uint256, uint256, uint256, uint256) {
        require(landXNFT.landArea(id) > 0, "this NFT has no land area set");
        require(landXNFT.rent(id) > 0, "this NFT has no rent set");
        require(xTokenRouter.getXToken(landXNFT.crop(id)) == address(this), "Unable to shard this NFT");
        uint256 shards = (landXNFT.landArea(id) * landXNFT.rent(id) * 1e6) / 10000;
        uint256 annualRent = getAnnualRentAmount(id);
        uint256 toSecurityDepositsAmount = (annualRent / 12  * keyProtocolValues.securityDepositMonths()) * grainPrices.prices(crop) * grainPrices.getXTokenPrice(xTokenRouter.getXToken(crop)) / (1e6 * 1e9);
        uint256 fee = _calcFee(shards);
        uint256 xTokensToInitialDeposit = annualRent * grainPrices.prices(crop) * grainPrices.getXTokenPrice(xTokenRouter.getXToken(crop)) / (1e6 * 1e9);
        uint256 toBeReceived = shards - fee - xTokensToInitialDeposit - toSecurityDepositsAmount;
        return (shards, fee, xTokensToInitialDeposit + toSecurityDepositsAmount, toBeReceived);    
    }

    function decimals() public pure override returns (uint8) {
        return 6;
	}
}
