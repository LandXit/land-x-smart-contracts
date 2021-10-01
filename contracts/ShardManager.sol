// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface ILANDXNFT is IERC165 {
    function landArea(uint256 id) external view returns (uint256);

    function rent(uint256 id) external view returns (uint256);

    function balanceOf(address account, uint256 id)
        external
        view
        returns (uint256);

    function isApprovedForAll(address account, address operator)
        external
        view
        returns (bool);

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;
}

//ShardManager NFT in = shards. Shards in = NFT
//1 shard = (landArea * rent) /  10000
contract ShardManager is
    Context,
    ERC20Permit,
    ERC20Burnable,
    Ownable,
    ERC1155Holder
{
    ILANDXNFT public landXNFT; //address of landXNFT

    uint256 public marketFee = 300; //3%

    //only the initial owner of the NFT can redeem it
    mapping(uint256 => address) public initialOwner;

    event Sharded(uint256 nftID, uint256 amount, string name);
    event BuyOut(uint256 nftID, uint256 amount, string name);

    constructor(address _landXNFT)
        ERC20Permit("LDXS")
        ERC20("LandX Shard", "LDXS")
    {
        landXNFT = ILANDXNFT(_landXNFT);
    }

    //deposits an NFT to get shards equivalence
    function getShards(uint256 _id) external {
        require(landXNFT.landArea(_id) > 0, "this NFT has no land area set");
        require(landXNFT.rent(_id) > 0, "this NFT has no rent set");
        require(
            landXNFT.balanceOf(msg.sender, _id) > 0,
            "you must own this NFT"
        );

        initialOwner[_id] = msg.sender; //set the initial owner

        //transfers the nft. must have setApprovalForAll
        landXNFT.safeTransferFrom(msg.sender, address(this), _id, 1, "");

        uint256 shards = ((landXNFT.landArea(_id) * landXNFT.rent(_id)) * 12 *
            (10**uint256(18))) / 10000;

        _mint(address(this), shards);
        
        uint256 fee = _calcPercentage(shards);
        _transfer(address(this), msg.sender, shards - fee);
        emit Sharded(_id, shards, symbol());
    }

    //returns the NFT after you deposit back the shards. requires allowance!
    function getTheNFT(uint256 _id) external {
        require(
            initialOwner[_id] == msg.sender,
            "only initial owner can redeem the NFT"
        );

        uint256 shards = ((landXNFT.landArea(_id) * landXNFT.rent(_id)) * 12 *
            (10**uint256(18))) / 10000;

        //burns shards!
        burn(shards);

        //transfer the NFTs
        landXNFT.safeTransferFrom(address(this), msg.sender, _id, 1, "");
        emit BuyOut(_id, shards, symbol());
    }

    // reclaim accidentally sent eth
    function withdraw() public onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    // change the address of landxNFT.
    function changeLandXNFTAddress(address _newAddress) public onlyOwner {
        landXNFT = ILANDXNFT(_newAddress);
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

   function preview(uint256 id) public view returns(uint256, uint256, uint256) {
        require(landXNFT.landArea(id) > 0, "this NFT has no land area set");
        require(landXNFT.rent(id) > 0, "this NFT has no rent set");
        uint256 shards = ((landXNFT.landArea(id) * landXNFT.rent(id)) * 12 *
            (10**uint256(18))) / 10000;
        uint256 fee = _calcPercentage(shards);
        uint256 toBeReceived = shards -fee;
        return (shards, fee, toBeReceived);    
    }
}
