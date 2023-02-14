const hre = require("hardhat");

async function main() {
  const MyCollectible = await hre.ethers.getContractFactory("BasicToken");
  const lock = await MyCollectible.deploy();

  await lock.deployed();

  console.log(
    `Lock with 1 ETH and unlock timestamp deployed to ${lock.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
