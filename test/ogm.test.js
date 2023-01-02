const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
describe("OGM", async () => {
  let deployedOGM;
  let owner;
  let addr1;
  let OGM;
  beforeEach(async () => {
    OGM = await ethers.getContractFactory("OGM");
    deployedOGM = await OGM.deploy();
    [owner, addr1] = await ethers.getSigners();
  });
  describe("Set MaxPurchase", () => {
    it("Set MaxPurchase for a user can buy at a time", async () => {
      await deployedOGM.setMaxPurchase(10);
      expect(await deployedOGM.MAX_PURCHASE()).to.equal(10);
    });
    it("Reverts Transaction if Non Owner Tries to change MaxPurchase", async () => {
      await expect(
        deployedOGM.connect(addr1).setMaxPurchase(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Change Max Supply", () => {
    it("Set MaxPurchase for a user can buy at a time", async () => {
      await deployedOGM.setMaxTokens(5000);
      expect(await deployedOGM.MAX_TOKENS()).to.equal(5000);
    });
    it("Reverts Transaction if Non Owner Tries to change MaxSupply", async () => {
      await expect(
        deployedOGM.connect(addr1).setMaxTokens(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Change NFT Price", () => {
    it("Change NFT Price", async () => {
      await deployedOGM.setCurrentPrice(10);
      expect(await deployedOGM.CURRENT_PRICE()).to.equal(10);
    });
    it("Reverts Transaction if Non Owner Tries to change NFTPrice", async () => {
      await expect(
        deployedOGM.connect(addr1).setCurrentPrice(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Mint NfT", () => {
    beforeEach(async () => {
      deployedOGM = await OGM.deploy();
    });
    it("Reverts If Sent Ether Amount is insufficient", async () => {
      await expect(
        deployedOGM.mint(10, {
          value: ethers.utils.parseEther("0.0000000002").toString()
        })
      ).to.be.revertedWith("Value sent is not correct");
    });
    it("Allows to Mint Till 1000", async () => {
      await deployedOGM.setMaxTokens(500);
      await deployedOGM.setMaxPurchase(50);
      for (let x = 1; x <= 5; x++) {
        await deployedOGM.mint(50, {
          value: ethers.utils.parseEther("4").toString()
        });
      }
      expect(await deployedOGM.balanceOf(owner.address)).to.equal(250);
      expect(await deployedOGM.totalSupply()).to.equal(250);

      for (let x = 1; x <= 5; x++) {
        await deployedOGM.connect(addr1).mint(50, {
          value: ethers.utils.parseEther("4").toString()
        });
      }
      expect(await deployedOGM.balanceOf(addr1.address)).to.equal(250);
      expect(await deployedOGM.totalSupply()).to.equal(500);
    });

    it("Reverts Transaction If Total Supply is Reached", async () => {
      await deployedOGM.setMaxTokens(200);
      await deployedOGM.setMaxPurchase(50);
      for (let x = 1; x <= 2; x++) {
        await deployedOGM.mint(50, {
          value: ethers.utils.parseEther("4").toString()
        });
      }
      expect(await deployedOGM.balanceOf(owner.address)).to.equal(100);
      expect(await deployedOGM.totalSupply()).to.equal(100);

      for (let x = 1; x <= 2; x++) {
        await deployedOGM.connect(addr1).mint(50, {
          value: ethers.utils.parseEther("4").toString()
        });
      }
      expect(await deployedOGM.balanceOf(addr1.address)).to.equal(100);
      expect(await deployedOGM.totalSupply()).to.equal(200);
      await expect(
        deployedOGM.mint(1, {
          value: ethers.utils.parseEther("0.08").toString()
        })
      ).to.be.revertedWith("Purchase would exceed max supply of OGM");
    });
  });

  describe("TokenURI", () => {
    const myBaseURI = "MyBaseURI/";
    it("Set Base URI", async () => {
      await deployedOGM.setBaseUri(myBaseURI);
      await expect(deployedOGM.tokenURI(1)).to.be.revertedWith(
        "ERC721Metadata: URI query for nonexistent token"
      );
      await deployedOGM.mint(50, {
        value: ethers.utils.parseEther("4").toString()
      });
      expect(await deployedOGM.tokenURI(1)).to.equal(`${myBaseURI}1`);
    });

    it("Reverts Transaction if Non Owner Tries to Change URI", async () => {
      await expect(
        deployedOGM.connect(addr1).setBaseUri(myBaseURI)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("WithDraw", () => {
    const provider = waffle.provider;
    it("Allow Admin To WithDraw Fund From Sale", async () => {
      await deployedOGM.connect(addr1).mint(50, {
        value: ethers.utils.parseEther("4").toString()
      });
      const contractBalance = await provider.getBalance(deployedOGM.address);

      expect(await deployedOGM.withdraw())
        .to.emit(deployedOGM, "WithDraw")
        .withArgs(owner.address, contractBalance);
      /
    });

    it("Reverts Transaction if Non Owner Tries to WithDraw Fund", async () => {
      await expect(deployedOGM.connect(addr1).withdraw()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });
});
