const hre = require("hardhat")
require("@nomiclabs/hardhat-web3")
const fs = require("fs-extra")

const ERC20_ABI = require("../utils/erc20_abi.js")
const VESTING_ABI = require("../utils/vesting_abi.js")

function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

async function main() {
	fs.removeSync("cache")
	fs.removeSync("artifacts")
	await hre.run("compile")

	// We get the contract to deploy
	const AH = await hre.ethers.getContractFactory("AuctionHouse")
	console.log("Deploying Auction House Contract...")

	let network = process.env.NETWORK ? process.env.NETWORK : "rinkeby"
	console.log(">-> Network is set to " + network)

	// ethers is avaialble in the global scope
	const [deployer] = await ethers.getSigners()
	const deployerAddress = await deployer.getAddress()
	const account = await web3.utils.toChecksumAddress(deployerAddress)
	const balance = await web3.eth.getBalance(account)

	console.log(
		"Deployer Account " + deployerAddress + " has balance: " + web3.utils.fromWei(balance, "ether"),
		"ETH"
	)

	let nft = "0x....." //mainnet
	let lndxTokenAddress = "0x......" //mainnet
	let usdcTokenAddress = "0x...." //mainnet
	if (network === "rinkeby") {
		nft = "0x1071B8DAF7f95014fE2013F15Ae717Ce3D5d5506" //rinkeby
		lndxTokenAddress = "0x579d9EBB5B5FFa356673f47E533356F31A15BEcD" //rinkeby
		usdcTokenAddress = "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b" //rinkeby
	}

	//address _landxNFT, address _lndx, address _usdc
	let deployed = await AH.deploy(nft, lndxTokenAddress, usdcTokenAddress)
	let dep = await deployed.deployed()

	await sleep(45000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [nft, lndxTokenAddress, usdcTokenAddress],
	})
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
