// SPDX-License-Identifier: GPL-3.0-OR-LATER
pragma solidity >=0.8.0 <0.9.0;

import "./TokenMarketplace.sol";

contract Smallhouse {

    event MarketplaceBroadcast(address contractAddress, string name);

    function broadcastMarketplace(address marketplaceContract) public {
        TokenMarketplace marketplace = TokenMarketplace(marketplaceContract);
        string memory name = marketplace.marketplaceName();
        emit MarketplaceBroadcast(marketplaceContract, name);
    }

}