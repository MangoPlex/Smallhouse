import { ContractTheme } from "../contracts/ContractTheme";
import { FeaturedMarketplace } from "./FeaturedMarketplace";

export interface NetworkInfo {
    
    chainId: number;
    name: string;
    symbol: string;
    supported: boolean;
    alternatives?: string[];

    /** List of featured marketplaces */
    featuredMarketplaces?: FeaturedMarketplace[];
    smallhouseContract?: string;

    tokenThemes?: {[x: string]: ContractTheme};

}