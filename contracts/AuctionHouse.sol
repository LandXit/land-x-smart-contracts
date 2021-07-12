// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract AuctionHouse is Ownable, Pausable {
	uint256 marketFeeLNDX = 50; //0.5%
	uint256 marketFeeUSDC = 300; //3%

	uint256 public auctionPeriod = 1 days;
	uint256 public auctionBoost = 5 minutes;
	uint256 public tickLNDX = 1; //bidding tick for LNDX
	uint256 public tickUSD = 1; //bidding tick ofr USD

	uint256 public auctionCount = 0;
	uint256 public sellsCount = 0;
	uint256 minSaleTime = 1 minutes;
	IERC1155 public landXNFT; //address for landXNFT
	IERC20 public lndx; //erc20 lndx
	IERC20 public usdc; //erc20 usdc

	mapping(uint256 => uint256) public fundsByBidder;

	mapping(uint256 => SellListing) public sellListings;
	mapping(uint256 => AuctionListing) public auctions;
	mapping(uint256 => bool) public auctionActive;

	event AuctionListed(
		uint256 auction_id,
		address auctioneer,
		uint256 nftID,
		uint256 currency,
		uint256 startPrice,
		uint256 endTime
	);
	event BidPlaced(uint256 auction_id, address indexed bidder, uint256 price, uint256 currency);
	event AuctionWon(uint256 auction_id, uint256 highestBid, uint256 currency, address winner);

	event OnSale(uint256 currency, uint256 itemID, uint256 price, uint256 endTime);
	event ListingSold(uint256 itemID, uint256 price, uint256 currency, address buyer);

	struct AuctionListing {
		address auctioneer;
		uint256 auctionId;
		uint256 nftID;
		uint256 startTime;
		uint256 endTime;
		uint256 currency; //0 - lndx, 1 - usdc
		uint256 startPrice;
		uint256 currentBid;
		uint256 tick;
		uint256 bidCount;
		address highBidder;
	}

	struct SellListing {
		uint256 currency; //0 - lndx, 1 - usdc
		address seller;
		uint256 nftID;
		uint256 startTime;
		uint256 endTime;
		uint256 price;
		bool sold;
	}

	//nothing fancy
	constructor(
		address _landxNFT,
		address _lndx,
		address _usdc
	) {
		landXNFT = IERC1155(_landxNFT);
		lndx = IERC20(_lndx);
		usdc = IERC20(_usdc);
		sellsCount = 0;
		auctionCount = 0;
	}

	/// @notice Create an auction listing and take custody of item
	/// @dev Note - this doesn't start the auction or the timer.
	/// @param nftID Item identifier for NFT listing types
	/// @param startPrice Starting price of auction. For auctions > 0.01 starting price, tick is set to 0.01, else it matches precision of the start price (triangular auction)
	function createAuction(
		uint256 nftID,
		uint256 startPrice,
		uint256 currency //0 - lndx, 1 - usdc
	) public whenNotPaused {
		require(startPrice >= 1, "startprice should be >= 1");

		//transfer the NFT
		landXNFT.safeTransferFrom(msg.sender, address(this), nftID, 1, "");

		AuctionListing memory al = AuctionListing(
			msg.sender,
			auctionCount,
			nftID,
			0,
			0,
			currency,
			startPrice,
			startPrice,
			0,
			0,
			address(0)
		);

		//TODO: move them up
		if (currency == 0) {
			al.tick = tickLNDX;
		} else {
			al.tick = tickUSD;
		}
		al.currency = currency;
		al.startTime = block.timestamp;
		al.endTime = block.timestamp + auctionPeriod;

		auctions[auctionCount] = al;
		auctionActive[auctionCount] = true;

		// event AuctionListed(
		// 		uint256 auction_id,
		// 		address auctioneer,
		// 		uint256 nftID,
		// 		uint256 currency,
		// 		uint256 startPrice,
		// 		uint256 endTime
		// 	);
		emit AuctionListed(al.auctionId, msg.sender, al.nftID, al.currency, al.startPrice, al.endTime);
		auctionCount = auctionCount + 1;
	}

	/// @notice Place a bid on an auction
	/// @param auctionId uint. Which listing to place bid on.
	function bid(uint256 auctionId, uint256 bidAmount) public {
		require(auctionId < auctionCount, "auctionId < auctionCount");
		require(auctionActive[auctionId] == true, "auctionActive[auctionId] == true");

		AuctionListing storage al = auctions[auctionId];

		require(block.timestamp < al.endTime, "auction expired");

		uint256 currentBid = al.currentBid;

		if (al.bidCount > 0) {
			require(bidAmount >= currentBid + al.tick, "bidAmount >= currentBid + al.tick");
			//refund the previous bidder
			if (al.currency == 0) {
				require(lndx.transfer(al.highBidder, al.currentBid), "transfer failed");
			} else {
				require(usdc.transfer(al.highBidder, al.currentBid), "transfer failed");
			}
			//for eth
			//(bool success, ) = al.highBidder.call{ value: al.currentBid }("");
			//require(success, "Address: unable to send value, recipient may have reverted");
		} else {
			require(bidAmount >= al.startPrice, "bidAmount >= al.startPrice");
		}

		//escrow tokens
		if (al.currency == 0) {
			require(lndx.transferFrom(msg.sender, address(this), bidAmount), "failed to transfer lndx");

			require(lndx.transfer(address(this), bidAmount), "transfer failed");
		} else {
			require(usdc.transferFrom(msg.sender, address(this), bidAmount), "failed to transfer usdc");
		}

		al.currentBid = bidAmount;
		al.highBidder = msg.sender;
		al.bidCount = al.bidCount + 1;

		if (((al.endTime - block.timestamp) + auctionBoost) < auctionPeriod)
			al.endTime = al.endTime + auctionBoost;

		auctions[auctionId] = al;

		emit BidPlaced(al.auctionId, msg.sender, bidAmount, al.currency);
	}

	/// @notice Claim. Release the goods and send funds to auctioneer. If no bids, item is returned to auctioneer!
	/// @param auctionId uint. What listing to claim.
	function claim(uint256 auctionId) public {
		require(auctionActive[auctionId] == true, "auctionActive[auctionId] == true");

		AuctionListing storage al = auctions[auctionId];

		require(block.timestamp >= al.endTime, "ongoing auction");

		auctionActive[auctionId] = false;

		if (al.bidCount == 0) {
			//Release the item back to the auctioneer
			landXNFT.safeTransferFrom(address(this), al.auctioneer, auctions[auctionId].nftID, 1, "");
			return; //nothing else to do
		} else {
			//Release the item to highBidder
			landXNFT.safeTransferFrom(address(this), al.highBidder, auctions[auctionId].nftID, 1, "");
		}

		//Release the funds to auctioneer
		if (al.currency == 0) {
			require(lndx.transfer(al.auctioneer, al.currentBid), "transfer failed");
		} else {
			require(usdc.transfer(al.auctioneer, al.currentBid), "transfer failed");
		}

		emit AuctionWon(auctionId, al.currentBid - al.tick, al.currency, al.highBidder);
	}

	/// @notice Returns time left in seconds or 0 if auction is over or not active.
	/// @param auctionId uint. Which auction to query.
	function getTimeLeft(uint256 auctionId) public view returns (uint256) {
		require(auctionId < auctionCount);
		uint256 time = block.timestamp;

		AuctionListing memory al = auctions[auctionId];

		return (time > al.endTime) ? 0 : al.endTime - time;
	}

	//puts an NFT for a simple sale
	//must be approved for all
	//saleDurationInSeconds - if you go over it, the sale is canceled and the nft must be removeFromSale
	function putForSale(
		uint256 currency,
		uint256 nftID,
		uint256 price,
		uint256 saleDurationInSeconds
	) public whenNotPaused returns (uint256) {
		require(saleDurationInSeconds >= minSaleTime, "sale time < minSaleTime");

		//transfer the NFT
		landXNFT.safeTransferFrom(msg.sender, address(this), nftID, 1, "");

		//update the storage
		SellListing memory sl = SellListing(
			currency,
			msg.sender,
			nftID,
			block.timestamp,
			block.timestamp + saleDurationInSeconds,
			price,
			false //sold
		);

		sellListings[sellsCount] = sl;
		sellsCount = sellsCount + 1;
		emit OnSale(currency, nftID, price, block.timestamp + saleDurationInSeconds);
		return sellsCount - 1; //return the saleID
	}

	//removeFromSale returs the item to the owner
	//a seller can remove an item put for sale anytime
	function removeFromSale(uint256 saleID) public {
		SellListing storage sl = sellListings[saleID];
		require(sl.sold == false, "can't claim a sold item");
		require(msg.sender == sl.seller, "only the seller can remove it");

		//Release the item back to the auctioneer
		landXNFT.safeTransferFrom(address(this), msg.sender, sl.nftID, 1, "");
	}

	// buys an NFT from a sale
	function buyItem(uint256 saleID) public {
		SellListing storage sl = sellListings[saleID];
		require(block.timestamp <= sl.endTime, "sale period expired");
		require(sl.sold == false, "can't buy a sold item");

		if (sl.currency == 0) {
			//lndx
			uint256 _fee = _calcPercentage(sl.price, marketFeeLNDX);
			uint256 amtForSeller = sl.price - _fee;

			//transfer all the trail token to the smart contract
			require(lndx.transferFrom(msg.sender, address(this), _fee), "failed to transfer lndx (fee)");
			require(lndx.transferFrom(msg.sender, sl.seller, amtForSeller), "failed to transfer lndx");
		} else {
			//usdc
			uint256 _fee = _calcPercentage(sl.price, marketFeeUSDC);
			uint256 amtForSeller = sl.price - _fee;
			require(usdc.transferFrom(msg.sender, address(this), _fee), "failed to transfer usdc (fee)");
			require(usdc.transferFrom(msg.sender, sl.seller, amtForSeller), "failed to transfer usdc");
		}

		//transfer the tokens
		landXNFT.safeTransferFrom(address(this), msg.sender, sl.nftID, 1, "");

		sl.sold = true;
		emit ListingSold(sl.nftID, sl.price, sl.currency, msg.sender);
	}

	function onERC1155Received(
		address,
		address,
		uint256,
		uint256,
		bytes memory
	) external pure returns (bytes4) {
		return 0xf23a6e61;
	}

	// withdraw the ETH from this contract (ONLY OWNER)
	function withdrawETH(uint256 amount) external onlyOwner {
		(bool success, ) = msg.sender.call{ value: amount }("");
		require(success, "transfer failed.");
	}

	//get tokens back.  emergency use only.
	function reclaimERC20(address _tokenContract) external onlyOwner {
		require(_tokenContract != address(0), "invalid address");
		IERC20 token = IERC20(_tokenContract);
		uint256 balance = token.balanceOf(address(this));
		require(token.transfer(msg.sender, balance), "transfer failed");
	}

	//get NFT back. emergency use only.
	function reclaimNFT(uint256 _nftID) external onlyOwner {
		landXNFT.safeTransferFrom(address(this), msg.sender, _nftID, 1, "");
	}

	// changes the market fee. 50 = 0.5%
	function changeMarketFeeLNDX(uint256 _marketFee) public onlyOwner {
		require(_marketFee < 500, "anti greed protection");
		marketFeeLNDX = _marketFee;
	}

	// changes the market fee. 50 = 0.5%
	function changeMarketFeeUSDC(uint256 _marketFee) public onlyOwner {
		require(_marketFee < 500, "anti greed protection");
		marketFeeUSDC = _marketFee;
	}

	// changes the min time for selling
	function changeMinTime(uint256 _newMinTime) public onlyOwner {
		minSaleTime = _newMinTime;
	}

	//300 = 3%, 1 = 0.01%
	function _calcPercentage(uint256 amount, uint256 basisPoints) internal pure returns (uint256) {
		require(basisPoints >= 0);
		return (amount * basisPoints) / 10000;
	}

	// sets the paused / unpaused state
	function setPaused(bool _setPaused) public onlyOwner {
		return (_setPaused) ? _pause() : _unpause();
	}

	//set bid Tick
	function setBidTickUSD(uint256 _newTick) public onlyOwner {
		tickUSD = _newTick;
	}

	//set bid Tick
	function setBidTickLNDX(uint256 _newTick) public onlyOwner {
		tickLNDX = _newTick;
	}

	//setAuctionPeriod. you should only increase it
	function setAuctionPeriod(uint256 _newPeriod) public onlyOwner {
		auctionPeriod = _newPeriod;
	}
}
