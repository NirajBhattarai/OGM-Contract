require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ganache");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.1",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    polygontestnet: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.key}`,
      accounts: [process.env.mnemonic],
      chainId: 80001,
      live: true,
      saveDeployments: true
    },

    SKALE: {
      url: process.env.RPC_URL,
      accounts: [process.env.mnemonic] /// Should Not Contain 0x at the start
    }
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  etherscan: {
    apiKey: process.env.etherscankey,
    customChains: [
      {
        network: "SKALE",
        chainId: Number(process.env.CHAIN_ID),
        urls: {
          apiURL: process.env.API_URL,
          browserURL: process.env.BROWSER_URL
        }
      }
    ]
  }
};
