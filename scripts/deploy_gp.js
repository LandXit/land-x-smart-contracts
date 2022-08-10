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
	const GrainPrices = await hre.ethers.getContractFactory("OraclePrices")
	console.log("Deploying GrainPrices Contract...")

	let network = process.env.NETWORK ? process.env.NETWORK : "rinkeby"
	console.log(">-> Network is set to " + network)

	// ethers is avaialble in the global scope
	const [deployer] = await ethers.getSigners()
	const deployerAddress = await deployer.getAddress()
	const account = await web3.utils.toChecksumAddress(deployerAddress)
	const balance = await web3.eth.getBalance(account)

	let xSoy = "" //mainnet
	let xWheat = ""
	let xCorn = ""
	let xRice = ""
	if (network === "rinkeby") {
		xSoy = "0x71da31eA7F788E8039915289789Bde99bdF3371d" //rinkeby
		xWheat = "0x191Fd8C5821B0587b471C8103B93517F2c605DA0"
		xCorn = "0x8ee44D1e14b7fae5257876594ccccc848B9680c9"
		xRice = "0xF7EeF6fDed5b69778569CC2513a58B8D790e1010"
	}

	console.log(
		"Deployer Account " + deployerAddress + " has balance: " + web3.utils.fromWei(balance, "ether"),
		"ETH"
	)

	let deployed = await GrainPrices.deploy(deployerAddress, xWheat, xSoy, xCorn, xRice)
	let dep = await deployed.deployed()

	await sleep(60000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [deployerAddress, xWheat, xSoy, xCorn, xRice],
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
