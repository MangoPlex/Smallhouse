import { SmallhouseTokenContract } from "../contracts/SmallhouseTokenContract";
import { NetworkInfo } from "./NetworkInfo";

export const NetworksMap = {
    "1"    : <NetworkInfo> {chainId: 1, name: "Ethereum Mainnet", symbol: "ETH", supported: false, alternatives: ["OpenSea"]},
    "3"    : <NetworkInfo> {
        chainId: 3,
        name: "Ropsten Testnet",
        symbol: "rETH",
        supported: true,
        featuredMarketplaces: [
            {
                name: "Smallhouse Unique Tokens",
                tokenContract: "0x7cb9CAF369570C673CEc9b0C70c0bE69F56787DF",
                marketplaceContract: "0x0Fa55923f24Ee76C46382aaF87D92FB8818A5F3d"
            }
        ],
        tokenThemes: {
            "0x7cb9CAF369570C673CEc9b0C70c0bE69F56787DF": new SmallhouseTokenContract("0x7cb9CAF369570C673CEc9b0C70c0bE69F56787DF", "Ropsten Testnet Smallhouse Demo")
        }
    },
    "100"  : <NetworkInfo> {chainId: 100, name: "xDai Mainnet", symbol: "xDAI", supported: true},
    "1337" : <NetworkInfo> {
        chainId: 1337, name: "Private Network", symbol: "ETH", supported: true,
        featuredMarketplaces: [
            {
                name: "Smallhouse Unique Tokens",
                tokenContract: "0x0DDEE6Fc5688A68ac01F3B62f3565B5c71fDd63f",
                marketplaceContract: "0xbD52F3dfE92B9323Df80C312e91423F3E7CA169f"
            }
        ],
        tokenThemes: {
            "0x0DDEE6Fc5688A68ac01F3B62f3565B5c71fDd63f": new SmallhouseTokenContract("0x0DDEE6Fc5688A68ac01F3B62f3565B5c71fDd63f", "Smart Contracts are cool!")
        }
    },
    "31337": <NetworkInfo> {chainId: 31337, name: "Local DF Network (Project Sophon)", symbol: "ETH", supported: true}
};