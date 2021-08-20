// SPDX-License-Identifier: GPL-3.0-OR-LATER
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SmallhouseUniqueToken is ERC721 {

    uint256 private counter;
    mapping (uint256 => address) public minter;

    constructor() ERC721("Smallhouse Unique Token", "SHUT") {
        counter = 0;
    }
    
    function mintToken() public returns (uint256) {
        uint256 tokenId = counter++;
        _safeMint(msg.sender, tokenId);
        minter[tokenId] = msg.sender;
        return tokenId;
    }

    function burnToken(uint256 tokenId) public {
        _burn(tokenId);
        delete minter[tokenId];
    }

}
