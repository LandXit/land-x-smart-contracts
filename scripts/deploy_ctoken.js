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

	let xTokenRouter = "0x631878fCBAbB7499B4515EC115d3B2C0B9282a33" //mainnet
	let rentFoundation = "0x02EfDeE67245883c0E26cfCC14C3b08027fbA6ba"
	let crop = "SOY"
	if (network === "goerli") {
		xTokenRouter = "0x631878fCBAbB7499B4515EC115d3B2C0B9282a33" //rinkeby
		rentFoundation = "0x02EfDeE67245883c0E26cfCC14C3b08027fbA6ba"
	}

	let deployed = await cToken.deploy(rentFoundation, xTokenRouter, crop)
	let dep = await deployed.deployed()

	await sleep(70000)
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
