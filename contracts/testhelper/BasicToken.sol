// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Example class - a mock class using delivering from ERC20
contract BasicToken is ERC20 {
    constructor() ERC20("ETH", "ETH") {
        _mint(msg.sender, 100000000000000000000000000000000000000000000000000);
    }

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
