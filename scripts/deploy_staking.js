const hre = require("hardhat")
require("@nomiclabs/hardhat-web3")
const fs = require("fs-extra")

const ERC20_ABI = require("../utils/erc20_abi.js")
const VESTING_ABI = require("../utils/vesting_abi.js")
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
	const StakingC = await hre.ethers.getContractFactory("Staking")
	console.log("Deploying Staking Contract...")

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

	let emissionRate = 48767800000
	let wtcTokenAddress = "0x......" //mainnet
	if (network === "rinkeby") {
		wtcTokenAddress = "0xFBb4273D7629096f1f3aF01B6BEaeB9A668b43e3" //rinkeby
	}

	let deployed = await StakingC.deploy(wtcTokenAddress, emissionRate) //50% APR
	let dep = await deployed.deployed()

	await sleep(45000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [wtcTokenAddress, emissionRate],
	})

	//change ownership to: 0x9b1a411a5b82a65f5f50aa603514935c7c9bf35a
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
