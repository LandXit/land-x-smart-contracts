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
		xTokenRouter = "0x50E5867D42f876ED75628940684ad510e9f40a5B"
		oraclePrices = "0x356fEB4C02710984f69aFA4AeeE4eAfB3CE80A9A"
		keyProtocalValues ="0x9363e1392706C8D17DF6926b10E1Fe2F25E6073a"
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
		constructorArguments: [xTokenRouter, oraclePrices, keyProtocalValues, uniswapRouter, quoter],
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
