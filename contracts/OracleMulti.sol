// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

/*
    LandX Chainlink Price Oracle
    @dev This is an untested proof of concept
*/

import '@chainlink/contracts/src/v0.8/ChainlinkClient.sol';
import '@chainlink/contracts/src/v0.8/ConfirmedOwner.sol';

interface OraclePrices {
  function setGrainPrice(string memory grain, uint256 price) external;
}

contract OracleMulti is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;
    bytes32 private constant jobId = 'ca98366cc7314957b8c012c72f05aeeb';
    uint256 private constant fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 LINK
    int256 private constant timesAmount = 1;
    string private constant uri = 'https://api-testnet.landx.fi/api/public/commodities';
    OraclePrices private oraclePrices;
 
    uint256 public wheat;
    uint256 public soy;
    uint256 public rice;
    uint256 public corn;

    event PriceSet(uint256 price, string name);
    event FailedPriceSet(uint256 price, string name);
    
    constructor(address _oraclePrices, address _chainlinkToken, address _chainlinkOracle) ConfirmedOwner(msg.sender) {
        require(_oraclePrices != address(0), "zero address is not allowed");
        require(_chainlinkToken != address(0), "zero address is not allowed");
        require(_chainlinkOracle != address(0), "zero address is not allowed");
        oraclePrices = OraclePrices(_oraclePrices);
        setChainlinkToken(_chainlinkToken);
        setChainlinkOracle(_chainlinkOracle);
    }

    function requestAll() external {
        requestWheat();
        requestSoy();
        requestRice();
        requestCorn();
    }

    function _request(string memory path, bytes4 selector) internal {
        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), selector);
        req.add('get', uri);
        req.add('path', path);
        req.addInt('times', timesAmount);
        sendChainlinkRequest(req, fee);
    }

    /* Chainlink Request Functions */
    function requestWheat() public {
        _request('WHEAT', this.fulfillWheat.selector);
    }
    function requestSoy() public {
        _request('SOY', this.fulfillSoy.selector);
    }
    function requestRice() public {
        _request('RICE', this.fulfillRice.selector);
    }
    function requestCorn() public {
        _request('CORN',  this.fulfillCorn.selector);
    }

    /* Chainlink Fulfill Functions */
    function fulfillWheat(bytes32 _requestId, uint256 _price) public recordChainlinkFulfillment(_requestId) {
        wheat = _price;
        try oraclePrices.setGrainPrice('WHEAT', _price) {emit PriceSet(_price, 'WHEAT');} catch {emit FailedPriceSet(_price, 'WHEAT');}
    }
    function fulfillSoy(bytes32 _requestId, uint256 _price) public recordChainlinkFulfillment(_requestId) {
        soy = _price;
        try oraclePrices.setGrainPrice('SOY', _price) {emit PriceSet(_price, 'SOY');} catch {emit FailedPriceSet(_price, 'SOY');}
    }
    function fulfillRice(bytes32 _requestId, uint256 _price) public recordChainlinkFulfillment(_requestId) {
        rice = _price;
        try oraclePrices.setGrainPrice('RICE', _price) {emit PriceSet(_price, 'RICE');} catch {emit FailedPriceSet(_price, 'RICE');}
    }
    function fulfillCorn(bytes32 _requestId, uint256 _price) public recordChainlinkFulfillment(_requestId) {
        corn = _price;
        try oraclePrices.setGrainPrice('CORN', _price) {emit PriceSet(_price, 'CORN');} catch {emit FailedPriceSet(_price, 'CORN');}
    }

    function updateOraclePrices(address _opAddress) public onlyOwner {
        require(_opAddress!= address(0), "zero address is not allowed");
        oraclePrices = OraclePrices(_opAddress);
    }

    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), 'Unable to transfer');
    }
}