const hre = require("hardhat")
require("@nomiclabs/hardhat-web3")
const fs = require("fs-extra")

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
	const ShardManagerC = await hre.ethers.getContractFactory("XToken")
	console.log("Deploying Shard Manager...")

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

	//mainnet
	let nftAddress = "" 
	let xTokenRouter = "" 
	let rentFoundation = ""
	let uniswapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
	let keyProtocalValues = ""
	let name = "xCORN"
	let oraclePrices = ""
	if (network === "goerli") {
		nftAddress = "0xAd968fcB7874c7502a51E5A5EFb4e96937425A72"
		lndx = "0x3931C703BEdB4f00f602f3F5F7838801F0b5BEb0"
		usdc = "0x4FEB71333c2A9fE81625a5727ab0Ed33dC77B841"
		xTokenRouter = "0x4E0dD48F5E13229553a18c8A584ea6764eD5bC99" 
		rentFoundation = "0x1D9aeA41741999e665A20391848EB86F0958b7F7"
		keyProtocalValues ="0x84E7CaB66182791864C411E7dF16584FC1400A5a"
		oraclePrices = "x84E7CaB66182791864C411E7dF16584FC1400A5a"
	}

	const deployed = await ShardManagerC.deploy(nftAddress, lndx, usdc, rentFoundation, xTokenRouter, keyProtocalValues, uniswapRouter, oraclePrices, name)

	let dep = await deployed.deployed()

	console.log("Contract deployed to:", dep.address)

	await sleep(70000) //40 seconds sleep
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [nftAddress, lndx, usdc, rentFoundation, xTokenRouter, keyProtocalValues, uniswapRouter, oraclePrices, name],
	})
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
