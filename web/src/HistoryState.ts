import { TokenListingEntry } from "./api/TokenListingEntry";

export interface HistoryState {
    currentPage: HistroyStatePage;

    marketplaceAddress?: string;

    tokenId?: string;
    tokenContract?: string;
    sellerAddress?: string;
    price?: string;
}

export type HistroyStatePage = "marketplace-listing" | "tokens-listing" | "token-view" | "list-token";