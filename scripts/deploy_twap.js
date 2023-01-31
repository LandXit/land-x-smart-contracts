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
	const twapContract = await hre.ethers.getContractFactory("TWAP")
	console.log("Deploying TWAP...")

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

	const deployed = await twapContract.deploy("0x1F98431c8aD98523631AE4a59f267346ea31F984")

	let dep = await deployed.deployed()

	console.log("Contract deployed to:", dep.address)

	await sleep(60000) //30 seconds sleep
	await hre.run("verify:verify", {
		address: "0x96dd5d8BF8de6d5F5F3Ef5da48C46b2a71013810",
		constructorArguments:["0x1F98431c8aD98523631AE4a59f267346ea31F984"]
	})
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
