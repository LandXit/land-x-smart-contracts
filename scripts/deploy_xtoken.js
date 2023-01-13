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
	let name = "SOY"
	let oraclePrices = ""
	if (network === "goerli") {
		nftAddress = "0x37Fbbc42D085B0d819887a8B7A7eC858099a0c66"
		lndx = "0x9AB379A11A45798f3e5fe962CbAA7577d39c9BBf"
		usdc = "0xCd869cbCA8E597a10b6e1AEbF12aBFD693e542f2"
		xTokenRouter = "0x50E5867D42f876ED75628940684ad510e9f40a5B" 
		rentFoundation = "0xB5d8E18B03A01BB57BDb9901Fd4b2C0Fd80e5548"
		keyProtocalValues ="0x9363e1392706C8D17DF6926b10E1Fe2F25E6073a"
		oraclePrices = "0x356fEB4C02710984f69aFA4AeeE4eAfB3CE80A9A"
	}

	const deployed = await ShardManagerC.deploy(nftAddress, lndx, usdc, rentFoundation, xTokenRouter, keyProtocalValues, oraclePrices, name)

	let dep = await deployed.deployed()

	console.log("Contract deployed to:", dep.address)

	await sleep(70000) //40 seconds sleep
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [nftAddress, lndx, usdc, rentFoundation, xTokenRouter, keyProtocalValues, oraclePrices, name],
	})
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
