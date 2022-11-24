// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

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
    bytes32 private jobId = 'ca98366cc7314957b8c012c72f05aeeb';
    uint256 private fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 LINK
    int256 private constant timesAmount = 1;
    OraclePrices private oraclePrices = OraclePrices(0xf2eCe499109B46f36DaefDD8351F85AC7b116107);
 
    uint256 public wheat;
    uint256 public soy;
    uint256 public rice;
    uint256 public corn;
    
    constructor() ConfirmedOwner(msg.sender) {
        setChainlinkToken(0x326C977E6efc84E512bB9C30f76E30c160eD06FB);
        setChainlinkOracle(0xCC79157eb46F5624204f47AB42b3906cAA40eaB7);
    }

    function requestAll() external {
        requestWheat();
        requestSoy();
        requestRice();
        requestCorn();
    }

    /* Chainlink Request Functions */
    function requestWheat() public {
        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfillWheat.selector);
        req.add('get', 'https://api-testnet.landx.fi/api/public/commodities');
        req.add('path', 'WHEAT');
        req.addInt('times', timesAmount);
        sendChainlinkRequest(req, fee);
    }
    function requestSoy() public {
        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfillSoy.selector);
        req.add('get', 'https://api-testnet.landx.fi/api/public/commodities');
        req.add('path', 'SOY');
        req.addInt('times', timesAmount);
        sendChainlinkRequest(req, fee);
    }
    function requestRice() public {
        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfillRice.selector);
        req.add('get', 'https://api-testnet.landx.fi/api/public/commodities');
        req.add('path', 'RICE');
        req.addInt('times', timesAmount);
        sendChainlinkRequest(req, fee);
    }
    function requestCorn() public {
        Chainlink.Request memory req = buildChainlinkRequest(jobId, address(this), this.fulfillCorn.selector);
        req.add('get', 'https://api-testnet.landx.fi/api/public/commodities');
        req.add('path', 'CORN');
        req.addInt('times', timesAmount);
        sendChainlinkRequest(req, fee);
    }

    /* Chainlink Fulfill Functions */
    function fulfillWheat(bytes32 _requestId, uint256 _price) public recordChainlinkFulfillment(_requestId) {
        wheat = _price;
        try oraclePrices.setGrainPrice('WHEAT', _price) {} catch {}
    }
    function fulfillSoy(bytes32 _requestId, uint256 _price) public recordChainlinkFulfillment(_requestId) {
        soy = _price;
        try oraclePrices.setGrainPrice('SOY', _price) {} catch {}
    }
    function fulfillRice(bytes32 _requestId, uint256 _price) public recordChainlinkFulfillment(_requestId) {
        rice = _price;
        try oraclePrices.setGrainPrice('RICE', _price) {} catch {}
    }
    function fulfillCorn(bytes32 _requestId, uint256 _price) public recordChainlinkFulfillment(_requestId) {
        corn = _price;
        try oraclePrices.setGrainPrice('CORN', _price) {} catch {}
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