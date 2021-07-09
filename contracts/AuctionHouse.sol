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

	mapping(uint256 => SellListing) public sellListings;

	uint256 public sellsCount = 0;
	uint256 minSaleTime = 1 minutes;
	IERC1155 public landXNFT; //address for landXNFT
	IERC20 public lndx; //erc20 lndx
	IERC20 public usdc; //erc20 usdc

	event OnSale(uint256 currency, uint256 itemID, uint256 price, uint256 endTime);
	event ListingSold(uint256 itemID, uint256 price, uint256 currency, address buyer);

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

	//get tokens back
	function reclaimERC20(address _tokenContract) external onlyOwner {
		require(_tokenContract != address(0), "invalid address");
		IERC20 token = IERC20(_tokenContract);
		uint256 balance = token.balanceOf(address(this));
		require(token.transfer(msg.sender, balance), "transfer failed");
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
}
