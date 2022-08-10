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

	let nftAddress = "" //mainnet
	let xTokenRouter = "" 
	let rentFoundation = ""
	if (network === "rinkeby") {
		nftAddress = "0xc6591e208b5B3FC2CB01644bbF3a8fFd1D56fD70" //rinkeby
		xTokenRouter = "0xAAB1c7e0a5bb297F837419E86E93B82bdCBC7c74" //rinkeby
		rentFoundation = "0x28890cA5acB1aFB6F993e73ea270eB53215fccBA"
	}

	const deployed = await ShardManagerC.deploy(nftAddress, rentFoundation, xTokenRouter)

	let dep = await deployed.deployed()

	console.log("Contract deployed to:", dep.address)

	await sleep(70000) //40 seconds sleep
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [nftAddress, rentFoundation, xTokenRouter],
	})
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
