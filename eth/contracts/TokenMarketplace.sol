// SPDX-License-Identifier: GPL-3.0-OR-LATER
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TokenMarketplace {

    struct TokenListing {
        address seller;
        uint256 price;
    }

    address public marketplaceOperator;
    string public marketplaceName;
    ERC721 public tokenContract;

    bool public isOpen;
    mapping (uint256 => TokenListing) public tokenListings;

    constructor(address contractAddress, string memory _marketplaceName) {
        marketplaceOperator = msg.sender;
        tokenContract = ERC721(contractAddress);
        isOpen = true;
        marketplaceName = _marketplaceName;
    }

    modifier operatorOnly() { require(msg.sender == marketplaceOperator, "TokenMarketplace: Only makretplace operator can call this function"); _; }
    modifier mustOpen() { require(isOpen, "TokenMarketplace: Marketplace is closed"); _; }

    event TokenListed(uint256 tokenId, address seller, uint256 price);
    event TokenPurchased(uint256 tokenId, address buyer);
    event TokenUnlisted(uint256 tokenId);

    function closeMarketplace() public operatorOnly mustOpen { isOpen = false; }

    function listToken(uint256 tokenId, uint256 price) public mustOpen {
        require(price > 0, "TokenMarketplace: Price must be over 0 wei");
        tokenContract.transferFrom(msg.sender, address(this), tokenId);
        tokenListings[tokenId] = TokenListing(msg.sender, price);
        emit TokenListed(tokenId, msg.sender, price);
    }

    function unlistToken(uint256 tokenId) public {
        require(tokenListings[tokenId].seller != address(0), "TokenMarketplace: This token haven't listed yet");
        require(tokenListings[tokenId].seller == msg.sender, "TokenMarketplace: You're not the token seller");
        tokenContract.transferFrom(address(this), msg.sender, tokenId);
        delete tokenListings[tokenId];
        emit TokenUnlisted(tokenId);
    }

    function buyToken(uint256 tokenId) public payable mustOpen {
        require(tokenListings[tokenId].seller != address(0), "TokenMarketplace: This token haven't listed yet");
        require(tokenListings[tokenId].price == msg.value, "TokenMarketplace: value does not match");
        TokenListing memory listing = tokenListings[tokenId];

        delete tokenListings[tokenId];
        tokenContract.transferFrom(address(this), msg.sender, tokenId);
        payable(listing.seller).transfer(listing.price);
        emit TokenPurchased(tokenId, msg.sender);
    }

}