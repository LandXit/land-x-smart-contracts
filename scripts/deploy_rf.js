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
	const RentFoundation = await hre.ethers.getContractFactory("RentFoundation")
	console.log("Deploying RentFoundation Contract...")

	let network = process.env.NETWORK ? process.env.NETWORK : "rinkeby"
	console.log(">-> Network is set to " + network)

	// ethers is avaialble in the global scope
	const [deployer] = await ethers.getSigners()
	const deployerAddress = await deployer.getAddress()
	const account = await web3.utils.toChecksumAddress(deployerAddress)
	const balance = await web3.eth.getBalance(account)

	let usdcTokenAddress = "0x4FEB71333c2A9fE81625a5727ab0Ed33dC77B841"
	let Lndx = "0x3931C703BEdB4f00f602f3F5F7838801F0b5BEb0"
	let kv = "0x9c325E1eef04A15ceBcd80db864Fc7CE88642d9C"
	let distributor = ""
	let oraclePrices = ""
	let nft = ""
	let router = ""

	//let usdcTokenAddress = "0x......" //mainnet
	if (network === "rinkeby") {
		usdcTokenAddress = "0xE3A2763c0437B622077761697BC22782d59DbE19" //rinkeby
		console.log(">-> USDC ADDRESS " + usdcTokenAddress)
	}

	console.log(
		"Deployer Account " + deployerAddress + " has balance: " + web3.utils.fromWei(balance, "ether"),
		"ETH"
	)

	let deployed = await RentFoundation.deploy(usdcTokenAddress, Lndx, oraclePrices, nft, router, kv, distributor)
	let dep = await deployed.deployed()

	await sleep(60000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [usdcTokenAddress, Lndx, oraclePrices, nft, router, kv, distributor],
		contract: "contracts/RentFoundation.sol:RentFoundation"
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
