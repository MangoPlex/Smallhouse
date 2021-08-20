import { BigNumber, CallOverrides, ContractTransaction, Overrides } from "ethers";
import { Marketplace } from "./Marketplace";

export class TokenListingEntry {

    constructor(
        public readonly marketplace: Marketplace,
        public readonly tokenContract: string,
        public tokenId: BigNumber,
        public sellerAddress: string,
        public price: BigNumber
    ) {}

    get api() { return this.marketplace.api; }
    get theme() { return this.api.networkInfo.tokenThemes[this.tokenContract]; }
    get displayName() { return this.theme? this.theme.getTokenName(this.tokenId) : this.tokenId.toString(); }
    
    async purchase() {
        await this.marketplace.contract.functions["buyToken"](this.tokenId, <CallOverrides> {
            value: this.price
        });
    }

    async unlist() {
        await this.marketplace.contract.functions["unlistToken"](this.tokenId);
    }

    async fetchListingStatus() {
        let obj = await this.marketplace.contract.functions["tokenListings"](this.tokenId);
        if (obj["seller"] == "0x0000000000000000000000000000000000000000") return false;
        return true;
    }

}