const LandXNFT = artifacts.require("LandXNFT");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(LandXNFT);
};
