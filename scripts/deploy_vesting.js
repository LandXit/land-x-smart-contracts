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
	const Vesting = await hre.ethers.getContractFactory("VestingWTC")
	console.log("Deploying Vesting Contract...")

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

	let wtcTokenAddress = "0x......" //mainnet
	if (network === "rinkeby") {
		wtcTokenAddress = "0x5d202a1369d112db015010d8713CdfEA25CD5324" //rinkeby
	}
	let deployed = await Vesting.deploy(wtcTokenAddress)
	let dep = await deployed.deployed()

	await sleep(45000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [wtcTokenAddress],
	})

	//---------- The Operations ----------

	const GASPrice = "1" //!important

	//give allowance for transfering tokens
	let erc20contract = new ethers.Contract(wtcTokenAddress, ERC20_ABI, deployer)
	let numberOfTokens = ethers.utils.parseUnits("60000000", 18) //just give 100% allowance
	let options = { gasLimit: 70000, gasPrice: ethers.utils.parseUnits(GASPrice, "gwei") }
	let tx = await erc20contract.increaseAllowance(dep.address, numberOfTokens, options)
	console.log("Vested Allowance Set.....", tx.hash)

	await sleep(30000) //allow allowance to be mined

	//1. -------------- VESTING --------------
	let wallet = "0x9B1a411A5b82A65f5f50Aa603514935C7c9bF35A"
	let amount = ethers.utils.parseUnits("100000", 18)
	let duration = 14 //days
	let cliff = 1 //days
	let vestingContract = new ethers.Contract(dep.address, VESTING_ABI, deployer)
	options = { gasLimit: 250000, gasPrice: ethers.utils.parseUnits(GASPrice, "gwei") }
	tx = await vestingContract.addTokenGrant(wallet, amount, duration, cliff, options)
	console.log("Vested Grant Created ", tx.hash)
	//------------------------------------------

	//2.
	wallet = "0x00000004Af22764bb04ddf4402Fd35F6e3011123"
	amount = ethers.utils.parseUnits("100000", 18)
	duration = 30 //days
	cliff = 1 //days
	tx = await vestingContract.addTokenGrant(wallet, amount, duration, cliff, options)
	console.log("Vested Grant Created ", tx.hash)

	//3.
	wallet = "0xeea4ffaD75BCE60Ec0C4711bE84243A441a27DB1"
	amount = ethers.utils.parseUnits("100000", 18)
	duration = 20 //days
	cliff = 1 //days
	tx = await vestingContract.addTokenGrant(wallet, amount, duration, cliff, options)
	console.log("Vested Grant Created ", tx.hash)

	//3.
	wallet = "0xCf8aEf3CB3421D569e770c84A5cDa30dAC8Ebb96"
	amount = ethers.utils.parseUnits("100000", 18)
	duration = 20 //days
	cliff = 1 //days
	tx = await vestingContract.addTokenGrant(wallet, amount, duration, cliff, options)
	console.log("Vested Grant Created ", tx.hash)

	//3.
	wallet = "0x2d9c53F6e6ED64591cfeca540AbB33De901ED37B"
	amount = ethers.utils.parseUnits("100000", 18)
	duration = 20 //days
	cliff = 1 //days
	tx = await vestingContract.addTokenGrant(wallet, amount, duration, cliff, options)
	console.log("Vested Grant Created ", tx.hash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
