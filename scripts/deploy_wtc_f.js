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
	const WTCMintingFoundation = await hre.ethers.getContractFactory("WTCMintingFoundation")
	console.log("Deploying WTC Distributor Contract...")

	let network = process.env.NETWORK ? process.env.NETWORK : "rinkeby"
	console.log(">-> Network is set to " + network)

	// ethers is avaialble in the global scope
	const [deployer] = await ethers.getSigners()
	const deployerAddress = await deployer.getAddress()
	const account = await web3.utils.toChecksumAddress(deployerAddress)
	const balance = await web3.eth.getBalance(account)

	let wtcTokenAddress = "0x......" //mainnet
	if (network === "rinkeby") {
		wtcTokenAddress = "0xfb3EF7FA8f5f90ea7EA63b84D98E063002Bc2233" //rinkeby
		console.log(">-> WTC ADDRESS " + wtcTokenAddress)
	}

	console.log(
		"Deployer Account " + deployerAddress + " has balance: " + web3.utils.fromWei(balance, "ether"),
		"ETH"
	)

	let deployed = await WTCMintingFoundation.deploy(wtcTokenAddress, deployerAddress)
	let dep = await deployed.deployed()

	await sleep(60000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [wtcTokenAddress, deployerAddress],
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
