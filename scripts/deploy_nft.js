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
	const LandXNFTContract = await hre.ethers.getContractFactory("LandXNFT")
	console.log("Deploying LandXNFT...")

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

	let xTokenRouter = "0x50E5867D42f876ED75628940684ad510e9f40a5B"
	let kv = "0x9363e1392706C8D17DF6926b10E1Fe2F25E6073a"
	let uri = "http://dev-landx-nfts.s3-website-us-east-1.amazonaws.com/j/"
	const deployed = await LandXNFTContract.deploy(xTokenRouter, kv, uri)

	let dep = await deployed.deployed()

	console.log("Contract deployed to:", dep.address)

	await sleep(70000) //30 seconds sleep
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [xTokenRouter, kv, uri],
	})
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
