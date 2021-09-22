// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract AuctionHouse is Ownable, Pausable {
	uint256 marketFeeWTC = 300; //3%
	uint256 marketFeeUSDC = 500; //5%

	uint256 public auctionBoost = 5 minutes;
	uint256 public tickWTC = 1; //bidding tick for WTC
	uint256 public tickUSD = 1; //bidding tick ofr USD

	uint256 public auctionCount = 0;
	uint256 public sellsCount = 0;
	uint256 public offersCount = 0;

	uint256 public maxOfferDuration = 180 days;

	IERC1155 public landXNFT; //address for landXNFT
	IERC20 public wtc; //erc20 WTC
	IERC20 public usdc; //erc20 usdc

	mapping(uint256 => SellListing) public sellListings;
	mapping(uint256 => AuctionListing) public auctions;
	mapping(uint256 => bool) public auctionActive;
	mapping(uint256 => Offer) public offers;

	event AuctionListed(
		uint256 auction_id,
		address auctioneer,
		uint256 nftID,
		uint256 currency,
		uint256 startPrice,
		uint256 endTime
	);
	event BidPlaced(uint256 auction_id, address indexed bidder, uint256 price, uint256 currency, uint256 endTime);
	event AuctionWon(uint256 auction_id, uint256 highestBid, uint256 currency, address winner);
	event AuctionCanceled(uint256 auction_id, address auctioneer);

	event OnSale(uint256 sale_id, uint256 currency, uint256 itemID, uint256 price, uint256 startTime, address privacy);
	event ListingSold(uint256 itemID, uint256 price, uint256 currency, address buyer);
	event SaleCanceled(uint256 sale_id, address seller);

	event OfferMade(uint256 offer_id, uint256 nftID, address maker, uint256 price, uint256 currency, uint256 endTime);
	event OfferAccepted(uint256 offer_id, uint256 nftID, uint256 price, uint256 currency, address maker);
	event OfferCanceled(uint256 offer_id, uint256 nftID, address maker);
	event OfferDeclined(uint256 offer_id, uint256 nftID, address seller);

	struct Offer {
		uint256 nftID;
		uint256 currency;
		uint256 price;
		uint256 listingID;
		address offerMaker;
		uint256 date;
		uint256 endTime;
		bool actual;
	}

	struct AuctionListing {
		address auctioneer;
		uint256 auctionId;
		uint256 nftID;
		uint256 startTime;
		uint256 endTime;
		uint256 currency; //0 - WTC, 1 - USDC
		uint256 startPrice;
		uint256 reservedPrice;
		uint256 currentBid;
		uint256 tick;
		uint256 bidCount;
		address highBidder;
		uint256 auctionPeriod;
	}

	struct SellListing {
		uint256 currency; //0 - WTC, 1 - USDC
		uint256 saleId;
		address seller;
		uint256 nftID;
		uint256 startTime;
		uint256 price;
		bool sold;
		bool removedFromSale;
		address privacy;
	}

	//nothing fancy
	constructor(
		address _landxNFT,
		address _wtc,
		address _usdc
	) {
		landXNFT = IERC1155(_landxNFT);
		wtc = IERC20(_wtc);
		usdc = IERC20(_usdc);
		sellsCount = 0;
		auctionCount = 0;
	}

	function makeOffer(uint256 nftID, uint256 price, uint256 currency, uint256 listingID, uint256 duration) public whenNotPaused {
		require(duration <= maxOfferDuration, "too long duration");
		require((auctionActive[listingID] == true && auctions[listingID].nftID > 0 && auctions[listingID].nftID == nftID && auctions[listingID].endTime >= block.timestamp) || 
			(sellListings[listingID].nftID > 0 && sellListings[listingID].startTime <= block.timestamp && sellListings[listingID].removedFromSale == false && sellListings[listingID].sold == false && sellListings[listingID].nftID == nftID), "token has no active listings");
		require(price >= 1, "price should be >= 1");
		Offer memory o = Offer(
			nftID,
			currency,
			price,
			listingID,
			msg.sender,
			block.timestamp,
			block.timestamp + duration,
			true
		);
		offers[offersCount] = o;
		offersCount = offersCount + 1;
		emit OfferMade(offersCount -1, nftID, o.offerMaker, price, currency, o.endTime);
	}

	function cancelOffer(uint256 offerID) public {
		require(offers[offerID].offerMaker == msg.sender, "only maker can cancel offer");
		require(offers[offerID].actual == true, "only actual offer can be cancelled");
		offers[offerID].actual = false;
		emit OfferCanceled(offerID, offers[offerID].nftID, offers[offerID].offerMaker);
	}

	function acceptOffer(uint256 offerID) public {
		require(offers[offerID].actual == true, "only actual offer can be accepted");
		require(offers[offerID].endTime >= block.timestamp, "offer is expired");
		if (sellListings[offers[offerID].listingID].nftID > 0 && sellListings[offers[offerID].listingID].nftID == offers[offerID].nftID) {
			SellListing storage sl = sellListings[offers[offerID].listingID];
			require(sl.sold == false && sl.removedFromSale == false, "listing is not active");
			landXNFT.safeTransferFrom(address(this), offers[offerID].offerMaker, sl.nftID, 1, "");

			//transfer funds to old owner
			if (offers[offerID].currency == 0) {
			  //WTC
			  uint256 _fee = _calcPercentage(offers[offerID].price, marketFeeWTC);
			  uint256 amountToTransfer = offers[offerID].price - _fee;
			  require(wtc.transferFrom(offers[offerID].offerMaker, address(this), _fee), "failed to transfer WTC (fee)");
			  require(wtc.transferFrom(offers[offerID].offerMaker, sl.seller, amountToTransfer), "transfer failed");
		    } else {
			  //USDC
			  uint256 _fee = _calcPercentage(offers[offerID].price, marketFeeUSDC);
			  uint256 amountToTransfer = offers[offerID].price - _fee;
			  require(usdc.transferFrom(offers[offerID].offerMaker, address(this), _fee), "failed to transfer USDC (fee)");
			  require(usdc.transferFrom(offers[offerID].offerMaker, sl.seller, amountToTransfer), "transfer failed");
		    }
			sl.sold = true;
			emit OfferAccepted(offerID, sl.nftID, offers[offerID].price, offers[offerID].currency, offers[offerID].offerMaker);
			return;
		}
		if (auctions[offers[offerID].listingID].nftID > 0 && auctions[offers[offerID].listingID].nftID == offers[offerID].nftID) {
			AuctionListing storage auction = auctions[offers[offerID].listingID];
			require(auctionActive[auction.auctionId] == true, "auction is not active");
		    require(block.timestamp < auction.endTime, "auction expired");
			
			landXNFT.safeTransferFrom(address(this), offers[offerID].offerMaker, auction.nftID, 1, "");

			//transfer funds to old owner
			if (offers[offerID].currency == 0) {
			  //WTC
			  uint256 _fee = _calcPercentage(offers[offerID].price, marketFeeWTC);
			  uint256 amountToTransfer = offers[offerID].price - _fee;
			  require(wtc.transferFrom(offers[offerID].offerMaker, address(this), _fee), "failed to transfer wtc (fee)");
			  require(wtc.transferFrom(offers[offerID].offerMaker, auction.auctioneer, amountToTransfer), "transfer failed");
		    } else {
			  //USDC
			  uint256 _fee = _calcPercentage(offers[offerID].price, marketFeeUSDC);
			  uint256 amountToTransfer = offers[offerID].price - _fee;
			  require(usdc.transferFrom(offers[offerID].offerMaker, address(this), _fee), "failed to transfer USDC (fee)");
			  require(usdc.transferFrom(offers[offerID].offerMaker, auction.auctioneer, amountToTransfer), "transfer failed");
		    }
			auctionActive[auction.auctionId] = false;
			emit OfferAccepted(offerID, auction.nftID, offers[offerID].price, offers[offerID].currency, offers[offerID].offerMaker);
			return;
		}
	}

	function declineOffer(uint256 offerID) public {
		require(offers[offerID].actual == true, "only actual offer can be declined");
		if (sellListings[offers[offerID].listingID].nftID > 0 && sellListings[offers[offerID].listingID].nftID == offers[offerID].nftID) {
			SellListing storage sl = sellListings[offers[offerID].listingID];
			require(sl.seller == msg.sender, "only seller can decline offer");
			offers[offerID].actual = false;
			emit OfferDeclined(offerID, sl.nftID, sl.seller);
			return;
		}
		if (auctions[offers[offerID].listingID].nftID > 0 && auctions[offers[offerID].listingID].nftID == offers[offerID].nftID) {
			offers[offerID].actual = false;
			AuctionListing storage auction = auctions[offers[offerID].listingID];
			require(auction.auctioneer == msg.sender, "only seller can decline offer");
			offers[offerID].actual = false;
			emit OfferDeclined(offerID, auction.nftID, auction.auctioneer);
			return;
		}
	}

	/// @notice Create an auction listing and take custody of item
	/// @dev Note - this doesn't start the auction or the timer.
	/// @param nftID Item identifier for NFT listing types
	/// @param startPrice Starting price of auction. For auctions > 0.01 starting price, tick is set to 0.01, else it matches precision of the start price (triangular auction)
	function createAuction(
		uint256 nftID,
		uint256 startPrice,
		uint256 reservedPrice,
		uint256 auctionPeriod,
		uint256 currency //0 - WTC, 1 - USDC
	) public whenNotPaused {
		require(startPrice >= 1, "startprice should be >= 1");
		require(reservedPrice > startPrice, "reserve price > start price");
		require(currency == 0 || currency ==1, "unsupported currency");

		//transfer the NFT
		landXNFT.safeTransferFrom(msg.sender, address(this), nftID, 1, "");

		AuctionListing memory al = AuctionListing(
			msg.sender,
			auctionCount,
			nftID,
			block.timestamp,
			block.timestamp + auctionPeriod,
			currency,
			startPrice,
			reservedPrice,
			0,
			0,
			0,
			address(0),
			auctionPeriod
		);

		//TODO: move them up
		if (currency == 0) {
			al.tick = tickWTC;
		} else {
			al.tick = tickUSD;
		}

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
		require(auctionActive[auctionId] == true, "auctionActive[auctionId] == true");

		AuctionListing storage al = auctions[auctionId];

		require(block.timestamp < al.endTime, "auction expired");

		uint256 currentBid = al.currentBid;

		if (al.bidCount > 0) {
			require(bidAmount >= currentBid + al.tick, "bidAmount >= currentBid + al.tick");
			//refund the previous bidder
			if (al.currency == 0) {
				require(wtc.transfer(al.highBidder, al.currentBid), "transfer failed");
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
			require(wtc.transferFrom(msg.sender, address(this), bidAmount), "failed to transfer WTC");

			//require(wtc.transfer(address(this), bidAmount), "transfer failed");
		} else {
			require(usdc.transferFrom(msg.sender, address(this), bidAmount), "failed to transfer usdc");
		}

		al.currentBid = bidAmount;
		al.highBidder = msg.sender;
		al.bidCount = al.bidCount + 1;

		if (((al.endTime - block.timestamp) + auctionBoost) < al.auctionPeriod)
			al.endTime = al.endTime + auctionBoost;

		auctions[auctionId] = al;

		emit BidPlaced(al.auctionId, msg.sender, bidAmount, al.currency, al.endTime);
	}

	/// @param auctionId uint.
	function cancelAuction(uint256 auctionId) public {
		require(auctionActive[auctionId] == true, "auctionActive[auctionId] == true");
		AuctionListing storage al = auctions[auctionId];
		require(block.timestamp < al.endTime, "auction expired");
		require(al.auctioneer == msg.sender, "only the auctioneer can cancel");

		//set the auction as inactive
		auctionActive[auctionId] = false;

		//if bids, refund the money to the highest bidder
		if (al.bidCount > 0) {
			if (al.currency == 0) {
				require(wtc.transfer(al.highBidder, al.currentBid), "transfer failed");
			} else {
				require(usdc.transfer(al.highBidder, al.currentBid), "transfer failed");
			}
		}

		//relsease the NFT back to the auctioneer
		landXNFT.safeTransferFrom(address(this), al.auctioneer, auctions[auctionId].nftID, 1, "");

		emit AuctionCanceled(al.auctionId, al.auctioneer);
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
			if (al.currentBid < al.reservedPrice) {
				//Release the item back to the auctioneer
				landXNFT.safeTransferFrom(address(this), al.auctioneer, auctions[auctionId].nftID, 1, "");
				return; //nothing else to do
			}
			//Release the item to highBidder
			landXNFT.safeTransferFrom(address(this), al.highBidder, auctions[auctionId].nftID, 1, "");
		}

		//Release the funds to auctioneer
		if (al.currency == 0) {
			//WTC
			uint256 _fee = _calcPercentage(al.currentBid, marketFeeWTC);
			uint256 amtForAuctioneer = al.currentBid - _fee;
			require(wtc.transfer(al.auctioneer, amtForAuctioneer), "transfer failed");
		} else {
			//USDC
			uint256 _fee = _calcPercentage(al.currentBid, marketFeeUSDC);
			uint256 amtForAuctioneer = al.currentBid - _fee;
			require(usdc.transfer(al.auctioneer, amtForAuctioneer), "transfer failed");
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
		uint256 startTime,
		address privacy
	) public whenNotPaused returns (uint256) {
		require(currency == 0 || currency ==1, "unsupported currency");
		if (startTime == 0 || startTime < block.timestamp) {
			startTime = block.timestamp;
		}

		//transfer the NFT
		landXNFT.safeTransferFrom(msg.sender, address(this), nftID, 1, "");

		//update the storage
		SellListing memory sl = SellListing(
			currency,
			sellsCount,
			msg.sender,
			nftID,
			startTime,
			price,
			false,
			false,
			privacy
		);

		sellListings[sellsCount] = sl;
		emit OnSale(sellsCount, currency, nftID, price, startTime, privacy);
		sellsCount = sellsCount + 1;
		return sellsCount - 1; //return the saleID
	}

	//removeFromSale returs the item to the owner
	//a seller can remove an item put for sale anytime
	function removeFromSale(uint256 saleID) public {
		SellListing storage sl = sellListings[saleID];
		require(sl.sold == false, "can't claim a sold item");
		require(msg.sender == sl.seller, "only the seller can remove it");

		sl.removedFromSale = true;

		//Release the item back to the auctioneer
		landXNFT.safeTransferFrom(address(this), msg.sender, sl.nftID, 1, "");
		emit SaleCanceled(sl.saleId, sl.seller);
	}

	// buys an NFT from a sale
	function buyItem(uint256 saleID) public {
		SellListing storage sl = sellListings[saleID];
		require(block.timestamp >= sl.startTime, "sale period didn't start");
		require(sl.sold == false, "can't buy a sold item");

		if (sl.privacy != address(0)) {
			require(msg.sender == sl.privacy, "this listing is private");
		}

		if (sl.currency == 0) {
			//WTC
			uint256 _fee = _calcPercentage(sl.price, marketFeeWTC);
			uint256 amtForSeller = sl.price - _fee;

			//transfer all the WTC token to the smart contract
			require(wtc.transferFrom(msg.sender, address(this), _fee), "failed to transfer WTC (fee)");
			require(wtc.transferFrom(msg.sender, sl.seller, amtForSeller), "failed to transfer WTC");
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

	// withdraw the ETH from this contract (ONLY OWNER). not needed...
	function withdrawETH(uint256 amount) external onlyOwner {
		(bool success, ) = msg.sender.call{ value: amount }("");
		require(success, "transfer failed.");
	}

	//get tokens back. emergency use only.
	function reclaimERC20(address _tokenContract) external onlyOwner {
		IERC20 token = IERC20(_tokenContract);
		uint256 balance = token.balanceOf(address(this));
		require(token.transfer(msg.sender, balance), "transfer failed");
	}

	//get NFT back. emergency use only.
	function reclaimNFT(uint256 _nftID) external onlyOwner {
		landXNFT.safeTransferFrom(address(this), msg.sender, _nftID, 1, "");
	}

	// changes the market fee. 50 = 0.5%
	function changeMarketFeeWTC(uint256 _marketFee) public onlyOwner {
		require(_marketFee < 500, "anti greed protection");
		marketFeeWTC = _marketFee;
	}

	// changes the market fee. 50 = 0.5%
	function changeMarketFeeUSDC(uint256 _marketFee) public onlyOwner {
		require(_marketFee < 500, "anti greed protection");
		marketFeeUSDC = _marketFee;
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
	function setBidTickWTC(uint256 _newTick) public onlyOwner {
		tickWTC = _newTick;
	}
}
