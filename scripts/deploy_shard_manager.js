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
	const ShardManagerC = await hre.ethers.getContractFactory("ShardManager")
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

	let nftAddress = "" //mainnet
	if (network === "rinkeby") {
		nftAddress = "0x194e9a314410A73fEF5CeD84c9397b50509D7fb5" //rinkeby
	}

	const deployed = await ShardManagerC.deploy(nftAddress)

	let dep = await deployed.deployed()

	console.log("Contract deployed to:", dep.address)

	await sleep(70000) //40 seconds sleep
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [nftAddress],
	})
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
