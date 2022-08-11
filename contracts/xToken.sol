// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

interface ILANDXNFT {
    function landArea(uint256 id) external view returns (uint256);
    function rent(uint256 id) external view returns (uint256);
    function crop(uint256 id) external view returns (string memory);
    function landOwner(uint256 id) external view returns (address);
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

//xToken NFT in = shards. xToken in = NFT
//1 xToken = (landArea * rent) /  10000
contract XToken is
    Context,
    ERC20Permit,
    ERC20Burnable,
    Ownable,
    ERC1155Holder
{
    string public constant crop = "SOY";
    address public xBasketContract;

    ILANDXNFT public landXNFT; //address of landXNFT
    IXTOKENROUTER public xTokenRouter; // address of xTokenRouter
    IRENTFOUNDATION public rentFoundation;
    IGRAINPRICES public grainPrices;
    uint256 public marketFee = 300; //3%

    //only the initial owner of the NFT can redeem it
    mapping(uint256 => address) public initialOwner;

    struct Stake {
        uint256 amount;
        uint256 startTime;
    }

    mapping(address => Stake) public Staked;
    mapping(address => uint256) public Yield;

    event Sharded(uint256 nftID, uint256 amount, string name);
    event BuyOut(uint256 nftID, uint256 amount, string name);

    constructor(address _landXNFT, address _rentFoundation, address _xTokenRouter)
        ERC20Permit("xSOY")
        ERC20("LandX xToken", "xSOY")
    {
        landXNFT = ILANDXNFT(_landXNFT);
        rentFoundation = IRENTFOUNDATION(_rentFoundation);
        xTokenRouter = IXTOKENROUTER(_xTokenRouter);
    }

    //deposits an NFT to get shards equivalence
    function getShards(uint256 _id) external {
        require(landXNFT.landArea(_id) > 0, "this NFT has no land area set");
        require(landXNFT.rent(_id) > 0, "this NFT has no rent set");
        require(keccak256(abi.encodePacked(landXNFT.crop(_id))) == keccak256(abi.encodePacked(crop)), "wrong crop");
        require(xTokenRouter.getXToken(crop) == address(this), "tokens are not set for this crop");
        require(
            landXNFT.balanceOf(msg.sender, _id) > 0,
            "you must own this NFT"
        );

        initialOwner[_id] = msg.sender; //set the initial owner

        //transfers the nft. must have setApprovalForAll
        landXNFT.safeTransferFrom(msg.sender, address(this), _id, 1, "");
        uint256 shards = ((landXNFT.landArea(_id) * landXNFT.rent(_id)) * (10**uint256(6))) / 10000;

        _mint(address(this), shards);
        uint256 fee = _calcPercentage(shards);
        uint256 initialDepositAmount = getAnnualRentAmount(_id);
        uint256 xTokensToInitialDeposit = initialDepositAmount * grainPrices.prices(crop) * grainPrices.getXTokenPrice(xTokenRouter.getXToken(crop)) / 1e6;

        _transfer(address(this), msg.sender, shards - fee - xTokensToInitialDeposit);

        if (landXNFT.landOwner(_id) != msg.sender && !rentFoundation.initialRentApplied(_id)) {
            revert("Cannot shard token by not landowner without initial rent applied");
        }

        rentFoundation.payInitialRent(_id, initialDepositAmount);
        emit Sharded(_id, shards, symbol());
    }

    //returns the NFT after you deposit back the shards. requires allowance!
    function getTheNFT(uint256 _id) external {
        require(
            initialOwner[_id] == msg.sender,
            "only initial owner can redeem the NFT"
        );

        uint256 shards = ((landXNFT.landArea(_id) * landXNFT.rent(_id)) * (10**uint256(6))) / 10000;

        //burns shards!
        burn(shards);

        //transfer the NFTs
        landXNFT.safeTransferFrom(address(this), msg.sender, _id, 1, "");
        emit BuyOut(_id, shards, symbol());
    }

    function stake(uint256 amount) public {
        _transfer(msg.sender, address(this), amount);
        uint256 yield = calculateYield(Staked[msg.sender]);
        Yield[msg.sender] += yield;
        Staked[msg.sender].startTime = block.timestamp;
        Staked[msg.sender].amount += amount;
    }

    function unstake(uint256 amount) public {
        require(amount <= Staked[msg.sender].amount, "insufficient funds");
        _transfer(address(this), msg.sender, amount);
        uint256 yield = calculateYield(Staked[msg.sender]);
        Yield[msg.sender] += yield;
        Staked[msg.sender].startTime = block.timestamp;
        Staked[msg.sender].amount -= amount;
    }

    function claim() public {
        address cToken = xTokenRouter.getCToken(crop);
        uint256 yield = calculateYield(Staked[msg.sender]);
        ICTOKEN(cToken).mint(msg.sender,  (Yield[msg.sender] + yield));
        Staked[msg.sender].startTime = block.timestamp;
        Yield[msg.sender] = 0;
    }

    function availableToClaim(address account) public view returns(uint256) {
        return Yield[account] + calculateYield(Staked[account]);
    }

    // calculate cTokanes amount generated since amount was staked
    function calculateYield(Stake storage s) view internal returns (uint256)
    {
        uint256 elapsedSeconds = block.timestamp - s.startTime;
        uint256 delimeter = 365 * 1 days;
        return (s.amount * elapsedSeconds) / delimeter; 
    }

    function xBasketTransfer(address _from, uint256 amount) external {
        require(msg.sender == xBasketContract,"not authorized");
        _transfer(_from, xBasketContract, amount);
    }

    // reclaim accidentally sent eth
    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
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

    // reclaim accidentally sent tokens
    function reclaimToken(IERC20 token) public onlyOwner {
        require(address(token) != address(0));
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
    }
    
	function changeMarketFee(uint256 _marketFee) public onlyOwner {
		require(_marketFee < 500, "anti greed protection");
		marketFee = _marketFee;
	}

    function _calcPercentage(uint256 amount) internal view returns (uint256) {
		return (amount * marketFee) / 10000;
	}

    function setXTokenRouter(address _router) public onlyOwner {
        xTokenRouter = IXTOKENROUTER(_router);
    }

    // return 2 * annual rent amount in kg
    function getAnnualRentAmount(uint256 tokenID) public view returns (uint256)
	{
		uint256 rent = landXNFT.rent(tokenID);
		uint256 area = landXNFT.landArea(tokenID);

		return 2 * (rent * area) / 10000;
	}

    function preview(uint256 id) public view returns(uint256, uint256, uint256, uint256) {
        require(landXNFT.landArea(id) > 0, "this NFT has no land area set");
        require(landXNFT.rent(id) > 0, "this NFT has no rent set");
        require(xTokenRouter.getXToken(landXNFT.crop(id)) == address(this), "Unable to shard this NFT");
        uint256 shards = (landXNFT.landArea(id) * landXNFT.rent(id) * 1e6) / 10000;
        uint256 fee = _calcPercentage(shards);
        uint256 xTokensToInitialDeposit = getAnnualRentAmount(id) * grainPrices.prices(crop) * grainPrices.getXTokenPrice(xTokenRouter.getXToken(crop)) / 1e6;
        uint256 toBeReceived = shards - fee - xTokensToInitialDeposit;
        return (shards, fee, xTokensToInitialDeposit, toBeReceived);    
    }

    function decimals() public pure override returns (uint8) {
        return 6;
	}
}
