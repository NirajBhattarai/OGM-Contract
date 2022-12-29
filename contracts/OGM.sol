// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OGM is ERC721Enumerable, Ownable {
    //bool public isPaused = true;
    string private _baseURL = "";

    // Max amount of token to purchase per account each time
    uint256 public MAX_PURCHASE = 20;

    // Maximum amount of tokens to supply.
    uint256 public MAX_TOKENS = 10000;

    // Current price.
    uint256 public CURRENT_PRICE = 80000000000000000;

    constructor() ERC721("OGM", "OGM") {}

    function setMaxTokens(uint256 maxTokens) external onlyOwner {
        MAX_TOKENS = maxTokens;
    }

    function setMaxPurchase(uint256 newMaxPurchase) external onlyOwner {
        MAX_PURCHASE = newMaxPurchase;
    }

    function setCurrentPrice(uint256 newCurrentPrice) external onlyOwner {
        CURRENT_PRICE = newCurrentPrice;
    }

    function mint(uint256 numberOfTokens) external payable {
        uint256 startTokenId = totalSupply();

        require(
            startTokenId + numberOfTokens <= MAX_TOKENS,
            "Purchase would exceed max supply of OGM"
        );
        require(
            CURRENT_PRICE * (numberOfTokens) <= msg.value,
            "Value sent is not correct"
        );
        for (uint256 index = 1; index <= numberOfTokens; index++) {
            _safeMint(msg.sender, startTokenId + index);
        }
    }

    /**
     * @dev Changes the base URI if we want to move things in the future (Callable by owner only)
     */
    function setBaseUri(string memory url) external onlyOwner {
        _baseURL = url;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );
        return
            bytes(_baseURL).length > 0
                ? string(abi.encodePacked(_baseURL, Strings.toString(tokenId)))
                : "";
    }

    /**
     * Withdraw
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }
}
