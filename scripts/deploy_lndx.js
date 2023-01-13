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
	const LNDXContract = await hre.ethers.getContractFactory("LNDX")
	console.log("Deploying LNDX...")

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

	veLNDX = "0x7d84546a035B4AF0dd937F0306C77527A116Fbd5"
	usdc = "0x115a8EdbA45E31ccB213Ddc98ece818327DaFd69"
	//deployerAddress is minter
	const deployed = await LNDXContract.deploy(usdc, veLNDX, 0)

	let dep = await deployed.deployed()

	console.log("Contract deployed to:", dep.address)

	await sleep(60000) //30 seconds sleep
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [usdc, veLNDX, 0]
	})
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
