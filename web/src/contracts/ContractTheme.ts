import { BigNumber } from "ethers";

export abstract class ContractTheme {

    displayName: string;
    description: string;
    classTheme = "";

    constructor(public readonly address: string) {}

    getTokenName(tokenId: BigNumber) {
        return "Token #" + tokenId;
    }

    async processTokenBackground(element: HTMLDivElement, tokenId: BigNumber) {}
    async processMarketplaceBackground(element: HTMLDivElement) {}
    async processPreviewDescription(element: HTMLDivElement, tokenId: BigNumber) { element.textContent = this.description; }
    async processFullDescription(element: HTMLDivElement, tokenId: BigNumber) { element.textContent = this.description; }

}