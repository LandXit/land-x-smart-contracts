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
	const keyValues = await hre.ethers.getContractFactory("KeyProtocolVariables")
	console.log("Deploying Key Protocol Variables...")

	let network = process.env.NETWORK ? process.env.NETWORK : "rinkeby"
	console.log(">-> Network is set to " + network)

	// ethers is avaialble in the global scope
	const [deployer] = await ethers.getSigners()
	const deployerAddress = await deployer.getAddress()
	const account = await web3.utils.toChecksumAddress(deployerAddress)
	const balance = await web3.eth.getBalance(account)


	/*if (network === "goerli") {
	   dao = "0xE290160438C5a20E577507167B64D73fe20Cc596", 
       hedgeFundWallet = "0x2244783870e036Bf6d6dEe5bcc232DC1F0d9f56d", 
       landxOperationalWallet = "0x6dEC30497EE5Ed98dB57D939c8aa71b64da0BBA7", 
       landxChoiceWallet = "0x8995d337429c08CbFf7C55766DAbaa6F2867Ca00", 
       xTokensSecurityWallet= "0x1230a4F730Ff6FC7833bC29e3656bc22c84a13Dc", 
       validatorCommisionWallet = "0x22BBdAD2AF360daE1d268d4a13de1144497Eb3Ee"
	}*/
	if (network === "goerli") {
		dao = "0x539D633D45eE0e16F425Ecd6127159805E11a3b8", 
		hedgeFundWallet = "0x539D633D45eE0e16F425Ecd6127159805E11a3b8", 
		landxOperationalWallet = "0x539D633D45eE0e16F425Ecd6127159805E11a3b8", 
		landxChoiceWallet = "0x539D633D45eE0e16F425Ecd6127159805E11a3b8", 
		xTokensSecurityWallet= "0x539D633D45eE0e16F425Ecd6127159805E11a3b8", 
		validatorCommisionWallet = "0x539D633D45eE0e16F425Ecd6127159805E11a3b8"
	 }

	console.log(
		"Deployer Account " + deployerAddress + " has balance: " + web3.utils.fromWei(balance, "ether"),
		"ETH"
	)

	let deployed = await keyValues.deploy(dao, hedgeFundWallet, landxOperationalWallet, landxChoiceWallet, xTokensSecurityWallet, validatorCommisionWallet)
	let dep = await deployed.deployed()

	await sleep(60000)
	await hre.run("verify:verify", {
		address: dep.address,
		constructorArguments: [dao, hedgeFundWallet, landxOperationalWallet, landxChoiceWallet, xTokensSecurityWallet, validatorCommisionWallet],
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
