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
	const GrainPrices = await hre.ethers.getContractFactory("contracts/OraclePrices.sol:OraclePrices")
	console.log("Deploying GrainPrices Contract...")

	let network = process.env.NETWORK ? process.env.NETWORK : "rinkeby"
	console.log(">-> Network is set to " + network)

	// ethers is avaialble in the global scope
	const [deployer] = await ethers.getSigners()
	const deployerAddress = await deployer.getAddress()
	const account = await web3.utils.toChecksumAddress(deployerAddress)
	const balance = await web3.eth.getBalance(account)

	let kv = ""
	let uniswapFactory = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
	let usdc = ""
	if (network === "goerli") {
		/*xSoy = "0x2c5Ef4A1c9862eEb45D610F160D613E69742ad24" //rinkeby
		xWheat = "0x45569C76529697BBEfDe526E94938064bBC39C1E"
		xCorn = "0x88917986f5E197D2767D3408F463179672e8E004"
		xRice = "0x3C07bF2A989c0f69298Db454245b20e4e448b26f"*/
		kv = "0x9363e1392706C8D17DF6926b10E1Fe2F25E6073a"
		uniswapFactory = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
		usdc = ""
	}

	console.log(
		"Deployer Account " + deployerAddress + " has balance: " + web3.utils.fromWei(balance, "ether"),
		"ETH"
	)

	let deployed = await GrainPrices.deploy(deployerAddress, kv, uniswapFactory, usdc)
	let dep = await deployed.deployed()

	await sleep(60000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [deployerAddress, kv, uniswapFactory, usdc],
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
