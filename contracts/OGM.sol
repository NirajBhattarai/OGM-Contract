// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

struct Price {
    uint256 privateSalePrice;
    uint256 publicSalePrice;
    bool isActive;
}

contract OGM is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    bytes32 public root;

    string private _baseURL = "";

    // Max amount of token to purchase per account each time
    uint256 public publicSaleMaxPurchase = 20;

    // Maximum amount of tokens to supply.
    uint256 public MAX_TOKENS = 10000;

    uint256 public privateSaleMaxPurchase = 5;

    bool public isPublicSaleActive = false;

    bool public isPrivateSaleActive = false;

    // mapping of tokenAddress with PriceDetails
    mapping(address => Price) public allowedTokens;

    // mapping of useraccount with mintedOnPrivateSale
    mapping(address => uint256) public mintedOnPrivateSale;

    constructor() ERC721("OGM", "OGM") {}

    /**
     * @dev Emitted when `owner` withdraw funds.
     */
    event WithDraw(address owner, uint256 indexed amount);
    /**
     * @dev Emitted when `tokenAddress` is approved/disapproved to trade
     */
    event SetTokenPrice(
        address tokenAddress,
        uint256 privateSalePrice,
        uint256 publicSalePrice,
        bool isActive
    );

    event Minted(address userAddress, address tokenAddress, uint256 amount);

    /**
     * @dev resize collection size
     */
    function setMaxTokens(uint256 maxTokens) external onlyOwner {
        MAX_TOKENS = maxTokens;
    }

    /**
     * @dev max nft size can be bought at single transaction
     */
    function setMaxPurchase(uint256 newMaxPurchase) external onlyOwner {
        publicSaleMaxPurchase = newMaxPurchase;
    }

    /**
     * @dev total ft can be bought on private sale
     */
    function changeMaxPrivateSale(uint256 newMaxPurchase) external onlyOwner {
        privateSaleMaxPurchase = newMaxPurchase;
    }

    /**
     * @dev activate/deactivate public sale
     */
    function changePublicSaleStatus(bool _newStatus) external onlyOwner {
        isPublicSaleActive = _newStatus;
    }

    /**
     * @dev activate/deactivate private sale
     */
    function changePrivateSaleStatus(bool _newStatus) external onlyOwner {
        isPrivateSaleActive = _newStatus;
    }

    function setTokenPrice(
        address tokenAddress,
        uint256 _privateSalePrice,
        uint256 _publicSalePrice,
        bool _isActive
    ) external onlyOwner {
        Price storage price = allowedTokens[tokenAddress];
        price.isActive = _isActive;
        price.publicSalePrice = _publicSalePrice;
        price.privateSalePrice = _privateSalePrice;

        emit SetTokenPrice(
            tokenAddress,
            _privateSalePrice,
            _publicSalePrice,
            _isActive
        );
    }

    function changeRoot(bytes32 _root) public onlyOwner {
        root = _root;
    }

    function privateMint(
        address tokenAddress,
        uint256 numberOfTokens,
        bytes32[] memory proof
    ) public nonReentrant {
        require(isPrivateSaleActive, "Sale Not Active");
        require(
            isValid(proof, keccak256(abi.encodePacked(msg.sender))),
            "Not a WhiteListed Address"
        );
        Price memory price = allowedTokens[tokenAddress];
        require(price.isActive, "OGM: Not an Active Token");
        uint256 previouslyMinted = mintedOnPrivateSale[msg.sender];
        require(
            previouslyMinted + numberOfTokens <= privateSaleMaxPurchase,
            "Purchase would exceed Private Sale Limit"
        );

        uint256 startTokenId = totalSupply();

        require(
            startTokenId + numberOfTokens <= MAX_TOKENS,
            "Purchase would exceed max supply of OGM"
        );

        for (uint256 index = 1; index <= numberOfTokens; index++) {
            _safeMint(msg.sender, startTokenId + index);
        }
        mintedOnPrivateSale[msg.sender] = previouslyMinted + numberOfTokens;
        ERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            numberOfTokens.mul(price.privateSalePrice)
        );
        emit Minted(msg.sender, tokenAddress, numberOfTokens);
    }

    function isValid(
        bytes32[] memory proof,
        bytes32 leaf
    ) public view returns (bool) {
        return MerkleProof.verify(proof, root, leaf);
    }

    function mint(
        address tokenAddress,
        uint256 numberOfTokens
    ) external payable nonReentrant {
        require(isPublicSaleActive, "Sale Not Active");
        Price memory price = allowedTokens[tokenAddress];
        require(price.isActive, "OGM: Not an Active Token");

        uint256 startTokenId = totalSupply();

        require(
            startTokenId + numberOfTokens <= MAX_TOKENS,
            "Purchase would exceed max supply of OGM"
        );
        for (uint256 index = 1; index <= numberOfTokens; index++) {
            _safeMint(msg.sender, startTokenId + index);
        }
        ERC20(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            numberOfTokens.mul(price.publicSalePrice)
        );
        emit Minted(msg.sender, tokenAddress, numberOfTokens);
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
    function withdraw(address tokenAddress) public onlyOwner {
        uint256 tokenBalance = ERC20(tokenAddress).balanceOf(address(this));
        require(tokenBalance > 0, "Token Balance must be greater than zero");
        ERC20(tokenAddress).transfer(msg.sender, tokenBalance);
        emit WithDraw(msg.sender, tokenBalance);
    }
}
