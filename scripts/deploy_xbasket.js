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
	const GrainPrices = await hre.ethers.getContractFactory("xBasket")
	console.log("Deploying XBasket Contract...")

	let network = process.env.NETWORK ? process.env.NETWORK : "rinkeby"
	console.log(">-> Network is set to " + network)

	// ethers is avaialble in the global scope
	const [deployer] = await ethers.getSigners()
	const deployerAddress = await deployer.getAddress()
	const account = await web3.utils.toChecksumAddress(deployerAddress)
	const balance = await web3.eth.getBalance(account)

	let oraclePrices = "" //mainnet
	let xTokenRouter = ""
	let uniswapRouter = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
	let quoter = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
	let keyProtocalValues = ""
	if (network === "goerli") {
		xTokenRouter = "0x4E0dD48F5E13229553a18c8A584ea6764eD5bC99"
		oraclePrices = "0x9D6EEe708a84BDa3aEb5b8C30Fc9Ee83Edd01929"
		keyProtocalValues ="0x84E7CaB66182791864C411E7dF16584FC1400A5a"
	}

	console.log(
		"Deployer Account " + deployerAddress + " has balance: " + web3.utils.fromWei(balance, "ether"),
		"ETH"
	)

	let deployed = await GrainPrices.deploy(xTokenRouter, oraclePrices, keyProtocalValues, uniswapRouter, quoter)
	let dep = await deployed.deployed()

	await sleep(60000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [xTokenRouter, oraclePrices],
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
