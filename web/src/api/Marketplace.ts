import { Smallhouse } from "./Smallhouse";
import { abi } from "@mangoplex/smallhouse-eth/bin/contracts/TokenMarketplace.json"
import * as ethers from "ethers";
import { TokenListingEntry } from "./TokenListingEntry";

export class Marketplace {

    tokenContract: string;
    contract: ethers.Contract;

    constructor(public readonly api: Smallhouse, public readonly marketplaceContract: string) {
        this.contract = new ethers.Contract(marketplaceContract, abi, api.signer);
    }

    async checkVerified() { return await this.api.isMarketplaceVerified(this.marketplaceContract); }
    async getName() { return (await this.contract.functions["marketplaceName"]())[0] as string; }
    async checkOpen() { return (await this.contract.functions["isOpen"]())[0] as boolean; }
    async getTokenContractAddress() { return (await this.contract.functions["tokenContract"]())[0] as string; }

    cachedListing: TokenListingEntry[] = [];
    async fetchListedTokens() {
        let abi2 = new ethers.utils.Interface(abi);
        const tokenContract = this.tokenContract = await this.getTokenContractAddress();

        let listing: TokenListingEntry[] = [];
        let listFilter = this.contract.filters["TokenListed"]();
        let unlistFilter = this.contract.filters["TokenUnlisted"]();
        let purchasedFilter = this.contract.filters["TokenPurchased"]();
        let log = await this.contract.queryFilter({
            address: listFilter.address,
            topics: [[
                <string> listFilter.topics[0],
                <string> unlistFilter.topics[0],
                <string> purchasedFilter.topics[0]
            ]]
        });

        for (let i = 0; i < log.length; i++) {
            let logEntry = abi2.parseLog(log[i]);
            switch (logEntry.name) {
                case "TokenListed":
                    listing.push(new TokenListingEntry(this, tokenContract, logEntry.args[0], logEntry.args[1], logEntry.args[2]));
                    break;
                case "TokenPurchased":
                case "TokenUnlisted":
                    let tokenId: ethers.BigNumber = logEntry.args[0];
                    let token = listing.find(v => v.tokenId.eq(tokenId));
                    listing.splice(listing.indexOf(token), 1);
                    break;
                default: break;
            }
        }

        return this.cachedListing = listing;
    }

    async fetchTokenLog(tokenId: ethers.BigNumber) {
        let abi2 = new ethers.utils.Interface(abi);

        let listFilter = this.contract.filters["TokenListed"]();
        let unlistFilter = this.contract.filters["TokenUnlisted"]();
        let purchasedFilter = this.contract.filters["TokenPurchased"]();
        let log = await this.contract.queryFilter({
            address: listFilter.address,
            topics: [
                [
                    <string> listFilter.topics[0],
                    <string> unlistFilter.topics[0],
                    <string> purchasedFilter.topics[0]
                ]
            ]
        });

        return log.map(v => abi2.parseLog(v)).filter(v => v.args[0] == tokenId.toString());
    }

    async listToken(tokenId: ethers.BigNumber, price: ethers.BigNumber) {
        await this.contract.functions["listToken"](tokenId, price);
    }

}