const hre = require("hardhat")
require("@nomiclabs/hardhat-web3")
const fs = require("fs-extra")

const { time } = require("@openzeppelin/test-helpers")

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
	const cToken = await hre.ethers.getContractFactory("CToken")
	console.log("Deploying CToken Contract...")

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

	let xTokenRouter = "" //mainnet
	let rentFoundation = ""
	let crop = "CORN"
	if (network === "goerli") {
		xTokenRouter = "0xa9BA799B7C041c9530CA6e212371E80dc202e97B" //rinkeby
		rentFoundation = "0xB26A5242655225d9Eccc0925bf907caCE98F1330"
	}

	let deployed = await cToken.deploy(rentFoundation, xTokenRouter, crop)
	let dep = await deployed.deployed()

	await sleep(60000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [rentFoundation, xTokenRouter, crop]
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
