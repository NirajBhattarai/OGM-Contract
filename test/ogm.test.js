const chai = require("chai");
const { solidity } = require("ethereum-waffle");
chai.use(solidity);
const { expect } = chai;
const { ethers, waffle } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const SHA256 = require("crypto-js/sha256");
const keccak256 = require("keccak256");
describe("OGM", async () => {
  let deployedOGM;
  let owner;
  let addr1;
  let OGM;
  let firstToken;
  let tokenFactory;
  let secondToken;
  let others;
  let whitelistAddresses;
  let merkleTree;
  beforeEach(async () => {
    OGM = await ethers.getContractFactory("OGM");
    tokenFactory = await ethers.getContractFactory("BasicToken");
    deployedOGM = await OGM.deploy();
    firstToken = await tokenFactory.deploy();
    secondToken = await tokenFactory.deploy();
    [owner, addr1, ...others] = await ethers.getSigners();
    whitelistAddresses = (await ethers.getSigners()).map(
      (account) => account.address
    );
    // Create a new array of `leafNodes` by hashing all indexes of the `whitelistAddresses`
    // using `keccak256`. Then creates a Merkle Tree object using keccak256 as the algorithm.
    // The leaves, merkleTree, and rootHas are all PRE-DETERMINED prior to whitelist claim
    let leafNodes = whitelistAddresses.map((addr) => keccak256(addr));
    merkleTree = new MerkleTree(leafNodes, keccak256, {
      sortPairs: true
    });
  });
  describe("Set MaxPurchase", () => {
    it("Set MaxPurchase for a user can buy at a time", async () => {
      await deployedOGM.setMaxPurchase(10);
      expect(await deployedOGM.publicSaleMaxPurchase()).to.equal(10);
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

  describe("ChangeMaxPrivateSale", () => {
    it("Should Change Max PrivateSale", async () => {
      await deployedOGM.changeMaxPrivateSale(10);
      expect(await deployedOGM.privateSaleMaxPurchase()).to.equal(10);
    });
    it("Reverts Transaction if Non Owner Tries to change MaxSupply", async () => {
      await expect(
        deployedOGM.connect(addr1).changeMaxPrivateSale(10)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Set Token Price", async () => {
    const privateSalePrice = "10000000000000000000000";
    const publicSalePrice = "100000000000000000000000000";
    it("Reverts Transaction if Non Owner Tries to change tokenPrice", async () => {
      await expect(
        deployedOGM
          .connect(addr1)
          .setTokenPrice(
            firstToken.address,
            privateSalePrice,
            publicSalePrice,
            true
          )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Set PrivateSalePrice,PublicSalePrice and SaleActive for given token", async () => {
      expect(
        deployedOGM.setTokenPrice(
          firstToken.address,
          privateSalePrice,
          publicSalePrice,
          true
        )
      )
        .to.be.emit(deployedOGM, "SetTokenPrice")
        .withArgs(firstToken.address, privateSalePrice, publicSalePrice, true);
      const [fetchedPrivateSalePrice, fetchedPublicSalePrice, isActive] =
        await deployedOGM.allowedTokens(firstToken.address);
      expect(fetchedPrivateSalePrice).to.be.equal(
        ethers.BigNumber.from(privateSalePrice)
      );
      expect(fetchedPublicSalePrice).to.be.equal(
        ethers.BigNumber.from(publicSalePrice)
      );
      expect(isActive).to.be.equal(true);
    });
  });

  describe("Change Root", async () => {
    it("changes root of contract", async () => {
      const rootHash = merkleTree.getRoot();
      await deployedOGM.changeRoot(rootHash);

      const fetchedRoot = await deployedOGM.root();
      expect(fetchedRoot).to.equal(`0x${rootHash.toString("hex")}`);
    });

    it("Reverts Transaction if Non Owner Tries to change root", async () => {
      const rootHash = merkleTree.getRoot();

      await expect(
        deployedOGM.connect(addr1).changeRoot(rootHash)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Private Mint", () => {
    const privateSalePrice = "10000000000000000000000";
    const publicSalePrice = "100000000000000000000000000";

    function setTokenPrice(
      privateSalePrice,
      publicSalePrice,
      tokenAddress = firstToken.address
    ) {
      return deployedOGM.setTokenPrice(
        tokenAddress,
        privateSalePrice,
        publicSalePrice,
        true
      );
    }

    it("Reverts If Sale is not active", async () => {
      let proof = merkleTree.getHexProof(keccak256(owner.address));

      await expect(
        deployedOGM.privateMint(firstToken.address, 10, proof)
      ).to.be.revertedWith("Sale Not Active");
    });

    it("Reverts If Acount is not whitelisted", async () => {
      let proof = merkleTree.getHexProof(keccak256(owner.address));
      await deployedOGM.changePrivateSaleStatus(true);

      await expect(
        deployedOGM.privateMint(firstToken.address, 10, proof)
      ).to.be.revertedWith("Not a WhiteListed Address");
    });

    it("Reverts If Tried to buy with Non-Approved Token", async () => {
      let proof = merkleTree.getHexProof(keccak256(owner.address));
      await deployedOGM.changePrivateSaleStatus(true);

      const rootHash = merkleTree.getRoot();
      await deployedOGM.changeRoot(rootHash);

      await expect(
        deployedOGM.privateMint(firstToken.address, 10, proof)
      ).to.be.revertedWith("OGM: Not an Active Token");
    });

    it("Reverts If Mint Amount Exceeds Private Sale Mint Limit", async () => {
      await setTokenPrice(privateSalePrice, publicSalePrice);
      let proof = merkleTree.getHexProof(keccak256(owner.address));

      await deployedOGM.changePrivateSaleStatus(true);

      const rootHash = merkleTree.getRoot();
      await deployedOGM.changeRoot(rootHash);

      await expect(
        deployedOGM.privateMint(firstToken.address, 10, proof)
      ).to.be.revertedWith("Purchase would exceed Private Sale Limit");
    });

    it("Reverts If Allowance is not sufficient", async () => {
      await setTokenPrice(privateSalePrice, publicSalePrice);
      let proof = merkleTree.getHexProof(keccak256(owner.address));
      await deployedOGM.changePrivateSaleStatus(true);

      const rootHash = merkleTree.getRoot();
      await deployedOGM.changeRoot(rootHash);

      await expect(
        deployedOGM.privateMint(firstToken.address, 5, proof)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Reverts If User doesnot have sufficient balance", async () => {
      await setTokenPrice(privateSalePrice, publicSalePrice);
      let proof = merkleTree.getHexProof(keccak256(addr1.address));
      await deployedOGM.changePrivateSaleStatus(true);
      const rootHash = merkleTree.getRoot();
      await deployedOGM.changeRoot(rootHash);
      await firstToken
        .connect(addr1)
        .approve(
          deployedOGM.address,
          "100000000000000000000000000000000000000000000000000000000000000000"
        );

      await expect(
        deployedOGM.connect(addr1).privateMint(firstToken.address, 5, proof)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("Allows User To Mint If User is whitelisted", async () => {
      await setTokenPrice(privateSalePrice, publicSalePrice);
      let proof = merkleTree.getHexProof(keccak256(owner.address));
      await deployedOGM.changePrivateSaleStatus(true);
      const rootHash = merkleTree.getRoot();
      await deployedOGM.changeRoot(rootHash);
      await firstToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000"
      );

      await expect(deployedOGM.privateMint(firstToken.address, 5, proof))
        .to.be.emit(deployedOGM, "Minted")
        .withArgs(owner.address, 5);
      expect(await deployedOGM.balanceOf(owner.address)).to.be.equal(5);
      expect(await deployedOGM.mintedOnPrivateSale(owner.address)).to.be.equal(
        5
      );
    });

    it("Allow User To Mint With Multiple Token", async () => {
      await setTokenPrice(privateSalePrice, publicSalePrice);
      await setTokenPrice(
        privateSalePrice,
        publicSalePrice,
        secondToken.address
      );
      let proof = merkleTree.getHexProof(keccak256(owner.address));
      await deployedOGM.changePrivateSaleStatus(true);
      const rootHash = merkleTree.getRoot();
      await deployedOGM.changeRoot(rootHash);
      await firstToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000"
      );
      await secondToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000"
      );

      await expect(deployedOGM.privateMint(firstToken.address, 2, proof))
        .to.be.emit(deployedOGM, "Minted")
        .withArgs(owner.address, 2);
      expect(await deployedOGM.balanceOf(owner.address)).to.be.equal(2);
      expect(await deployedOGM.mintedOnPrivateSale(owner.address)).to.be.equal(
        2
      );

      await expect(deployedOGM.privateMint(secondToken.address, 3, proof))
        .to.be.emit(deployedOGM, "Minted")
        .withArgs(owner.address, 3);
      expect(await deployedOGM.balanceOf(owner.address)).to.be.equal(5);
      expect(await deployedOGM.mintedOnPrivateSale(owner.address)).to.be.equal(
        5
      );
    });

    it("Reverts Transaction If Total Supply is Reached", async () => {
      await deployedOGM.changePublicSaleStatus(true);
      await deployedOGM.changePrivateSaleStatus(true);
      await deployedOGM.setMaxTokens(200);
      await deployedOGM.setMaxPurchase(50);
      const rootHash = merkleTree.getRoot();
      let proof = merkleTree.getHexProof(keccak256(owner.address));
      await deployedOGM.changeRoot(rootHash);
      await setTokenPrice(privateSalePrice, publicSalePrice);
      await firstToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000000000000000"
      );
      for (let x = 1; x <= 2; x++) {
        await deployedOGM.mint(firstToken.address, 50);
      }
      expect(await deployedOGM.balanceOf(owner.address)).to.equal(100);
      expect(await deployedOGM.totalSupply()).to.equal(100);
      for (let x = 1; x <= 2; x++) {
        await deployedOGM.mint(firstToken.address, 50);
      }
      expect(await deployedOGM.balanceOf(owner.address)).to.equal(200);
      expect(await deployedOGM.totalSupply()).to.equal(200);
      await expect(
        deployedOGM.privateMint(firstToken.address, 5, proof)
      ).to.be.revertedWith("Purchase would exceed max supply of OGM");
    });
  });

  describe("Mint NfT", () => {
    const privateSalePrice = "10000000000000000000000";
    const publicSalePrice = "100000000000000000000000000";
    function setTokenPrice(
      privateSalePrice,
      publicSalePrice,
      tokenAddress = firstToken.address
    ) {
      return deployedOGM.setTokenPrice(
        tokenAddress,
        privateSalePrice,
        publicSalePrice,
        true
      );
    }
    it("Reverts If Sale is not active", async () => {
      await expect(deployedOGM.mint(firstToken.address, 10)).to.be.revertedWith(
        "Sale Not Active"
      );
    });
    it("Reverts If Tried to buy with Non-Approved Token", async () => {
      await deployedOGM.changePublicSaleStatus(true);
      await expect(deployedOGM.mint(firstToken.address, 10)).to.be.revertedWith(
        "OGM: Not an Active Token"
      );
    });
    it("Reverts If Allowance is not sufficient", async () => {
      await setTokenPrice(privateSalePrice, publicSalePrice);
      await deployedOGM.changePublicSaleStatus(true);
      await expect(deployedOGM.mint(firstToken.address, 10)).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });
    it("Reverts If User doesnot have sufficient balance", async () => {
      await setTokenPrice(privateSalePrice, publicSalePrice);
      await deployedOGM.changePublicSaleStatus(true);
      await firstToken
        .connect(addr1)
        .approve(
          deployedOGM.address,
          "100000000000000000000000000000000000000000000000000000000000000000"
        );

      await expect(
        deployedOGM.connect(addr1).mint(firstToken.address, 5)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
    it("Allows User To Mint If User is whitelisted", async () => {
      await setTokenPrice(privateSalePrice, publicSalePrice);
      await deployedOGM.changePublicSaleStatus(true);
      await firstToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000"
      );

      await expect(deployedOGM.mint(firstToken.address, 5))
        .to.be.emit(deployedOGM, "Minted")
        .withArgs(owner.address, 5);
      expect(await deployedOGM.balanceOf(owner.address)).to.be.equal(5);
    });

    it("Allow User To Mint With Multiple Token", async () => {
      await setTokenPrice(privateSalePrice, publicSalePrice);
      await setTokenPrice(
        privateSalePrice,
        publicSalePrice,
        secondToken.address
      );
      await deployedOGM.changePublicSaleStatus(true);

      await firstToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000"
      );
      await secondToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000"
      );

      await expect(deployedOGM.mint(firstToken.address, 2))
        .to.be.emit(deployedOGM, "Minted")
        .withArgs(owner.address, 2);
      expect(await deployedOGM.balanceOf(owner.address)).to.be.equal(2);

      await expect(deployedOGM.mint(secondToken.address, 3))
        .to.be.emit(deployedOGM, "Minted")
        .withArgs(owner.address, 3);
      expect(await deployedOGM.balanceOf(owner.address)).to.be.equal(5);
    });

    it("Reverts Transaction If Total Supply is Reached", async () => {
      await deployedOGM.changePublicSaleStatus(true);
      await deployedOGM.setMaxTokens(200);
      await deployedOGM.setMaxPurchase(50);
      await setTokenPrice(privateSalePrice, publicSalePrice);
      await firstToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000000000000000"
      );
      for (let x = 1; x <= 2; x++) {
        await deployedOGM.mint(firstToken.address, 50);
      }
      expect(await deployedOGM.balanceOf(owner.address)).to.equal(100);
      expect(await deployedOGM.totalSupply()).to.equal(100);
      for (let x = 1; x <= 2; x++) {
        await deployedOGM.mint(firstToken.address, 50);
      }
      expect(await deployedOGM.balanceOf(owner.address)).to.equal(200);
      expect(await deployedOGM.totalSupply()).to.equal(200);
      await expect(deployedOGM.mint(firstToken.address, 5)).to.be.revertedWith(
        "Purchase would exceed max supply of OGM"
      );
    });
  });

  describe("TokenURI", () => {
    const privateSalePrice = "10000000000000000000000";
    const publicSalePrice = "100000000000000000000000000";

    const myBaseURI = "MyBaseURI/";
    it("Set Base URI", async () => {
      await deployedOGM.setBaseUri(myBaseURI);
      await expect(deployedOGM.tokenURI(1)).to.be.revertedWith(
        "ERC721Metadata: URI query for nonexistent token"
      );

      await deployedOGM.changePublicSaleStatus(true);
      await deployedOGM.setTokenPrice(
        firstToken.address,
        privateSalePrice,
        publicSalePrice,
        true
      );
      await firstToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000000000000000"
      );
      await deployedOGM.mint(firstToken.address, 50);
      expect(await deployedOGM.tokenURI(1)).to.equal(`${myBaseURI}1`);
    });

    it("Reverts Transaction if Non Owner Tries to Change URI", async () => {
      await expect(
        deployedOGM.connect(addr1).setBaseUri(myBaseURI)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("WithDraw", () => {
    it("Allow Admin To WithDraw Fund From Sale", async () => {
      await deployedOGM.changePublicSaleStatus(true);
      await deployedOGM.setTokenPrice(
        firstToken.address,
        "10000000000",
        "10000000000",
        true
      );
      await firstToken.approve(
        deployedOGM.address,
        "100000000000000000000000000000000000000000000000000000000000000000000000000000"
      );
      await deployedOGM.mint(firstToken.address, 50);
      const contractBalance = await firstToken.balanceOf(deployedOGM.address);

      expect(await deployedOGM.withdraw(firstToken.address))
        .to.emit(deployedOGM, "WithDraw")
        .withArgs(owner.address, contractBalance);
    });

    it("Reverts Transaction if Non Owner Tries to WithDraw Fund", async () => {
      await expect(deployedOGM.withdraw(firstToken.address)).to.be.revertedWith(
        "Token Balance must be greater than zero"
      );
    });

    it("Reverts Transaction if Non Owner Tries to WithDraw Fund", async () => {
      await expect(
        deployedOGM.connect(addr1).withdraw(firstToken.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
