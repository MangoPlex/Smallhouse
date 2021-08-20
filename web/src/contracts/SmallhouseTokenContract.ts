import { BigNumber } from "ethers";
import { sha256 } from "ethers/lib/utils";
import { Adjectives } from "../generative/Adjectives";
import { Words } from "../generative/Words";
import { QuickElements } from "../QuickElements";
import { ContractTheme } from "./ContractTheme";

const RARITY_COLOR = {
    "common"      : "#ffffff",
    "uncommon"    : "#77ff88",
    "rare"        : "#9999ff",
    "epic"        : "#af55af",
    "legendary"   : "#ffce55",
    "mythic"      : "#ff67ff",
};

export class SmallhouseTokenContract extends ContractTheme {

    constructor(token: string, public readonly magicWord: string) {
        super(token);
        this.displayName = "Smallhouse Unique Token";
        this.description = "A Smallhouse unique token";
    }

    getHash(tokenId: BigNumber) {
        let magicWord = "Smallhouse Unique Token #" + tokenId.toString() + ", with the magic word '" + this.magicWord + "', on contract with address " + this.address;
        let sha256Hash = sha256(magicWord.split("").map(ch => ch.charCodeAt(0)));
        return sha256Hash.replace(/../g, e => "," + e).substr(1).split(",").map(v => parseInt(v, 16));
    }

    getTokenName(tokenId: BigNumber) {
        let sha256Bytes = this.getHash(tokenId);
        let adjIndex = (sha256Bytes[0] << 16) | (sha256Bytes[1] << 8) | sha256Bytes[2];
        let objIndex = (sha256Bytes[3] << 16) | (sha256Bytes[4] << 8) | sha256Bytes[5];

        let adj = Adjectives[adjIndex % Adjectives.length];
        adj = adj.charAt(0).toUpperCase() + adj.substring(1);
        let obj = Words[objIndex % Words.length];
        obj = obj.charAt(0).toUpperCase() + obj.substring(1);

        return adj + " " + obj;
    }

    getTokenRarity(hash: ArrayLike<number>) {
        let bound1 = (hash[6] << 16) | (hash[7] << 8) | hash[8];
        let bound2 = (hash[9] << 16) | (hash[10] << 8) | hash[11];
        let chance = Math.min(bound1, bound2) / Math.max(bound1, bound2);
        if (chance <= 0.01) return "mythic";
        if (chance <= 0.03) return "legendary";
        if (chance <= 0.08) return "epic";
        if (chance <= 0.19) return "rare";
        if (chance <= 0.37) return "uncommon";
        return "common";
    }

    getTokenAccentColor(hash: ArrayLike<number>) {
        const darkArea = 128;
        const lightArea = 64;
        
        function dark(a: number) { return Math.floor(a / 255 * darkArea); }
        function light(a: number) { return (255 - lightArea) + Math.floor(a / 255 * lightArea); }
        return [
            [dark(hash[12]), dark(hash[13]), dark(hash[14])],
            [light(hash[19]), light(hash[18]), light(hash[15])]
        ];
    }

    getInitalDegRotation(hash: ArrayLike<number>) { return (hash[30] / 255) * 360; }
    getAddDegRotation(hash: ArrayLike<number>) { return (hash[31] / 255) * 360; }

    divideRGB(map: number[][], count: number) {
        let val: number[][] = new Array(count);
        function progres(a: number, b: number, p: number) {
            //const aa = a * a, bb = b * b;
            //return Math.sqrt(aa + ((bb - aa) * p));
            const sa = Math.sqrt(a), sb = Math.sqrt(b);
            const c = sa + ((sb - sa) * p);
            return c * c;
        }
        function blendRGB(a: number[], b: number[], p: number) {
            return [
                progres(a[0], b[0], p),
                progres(a[1], b[1], p),
                progres(a[2], b[2], p)
            ];
        }
        for (let i = 0; i < count; i++) val[i] = blendRGB(map[0], map[1], i / (count - 1));
        return val;
    }

    async processPreviewDescription(element: HTMLDivElement, tokenId: BigNumber) {
        let hash = this.getHash(tokenId);
        let rarity = this.getTokenRarity(hash);
        element.textContent = "";

        let e = QuickElements.label(rarity.charAt(0).toUpperCase() + rarity.substring(1) + " ");
        e.style.color = RARITY_COLOR[rarity];
        e.style.whiteSpace = "pre";
        element.appendChild(e);
        element.appendChild(QuickElements.label("Token"));
    }

    async processMarketplaceBackground(element: HTMLDivElement) {
        let width = element.offsetWidth;
        let height = element.offsetHeight;

        const miniboxWidthScale = 0.4;
        const miniboxHeightScale = 0.4;
        const boxes = 8;

        const accent = [[255, 109, 51], [255, 206, 115]];
        const colors = this.divideRGB(accent, boxes);
        const miniboxXScale = 0.2;
        const miniboxYScale = 0.7;
        const miniboxAXScale = 0.08;
        const miniboxAYScale = -0.06;
        const rotationInit = -45.0;
        const rotationAdd = 8.0;

        let currentRotation = rotationInit, currentXScale = miniboxXScale, currentYScale = miniboxYScale;
        for (let i = 0; i < boxes; i++) {
            let e = document.createElement("div");
            let color = colors[i];

            e.style.position = "absolute";
            e.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            e.style.left = ((currentXScale - miniboxWidthScale / 2) * width) + "px";
            e.style.top = ((currentYScale - miniboxWidthScale / 2) * height) + "px";
            e.style.width = (miniboxWidthScale * width) + "px";
            e.style.height = (miniboxHeightScale * height) + "px";
            e.style.rotate = currentRotation + "deg";

            currentRotation += rotationAdd;
            currentXScale += miniboxAXScale;
            currentYScale += miniboxAYScale;
            element.appendChild(e);
        }
    }

    async processTokenBackground(element: HTMLDivElement, tokenId: BigNumber) {
        let width = element.offsetWidth;
        let height = element.offsetHeight;

        const miniboxWidthScale = 0.7;
        const miniboxHeightScale = 0.7;
        let hash = this.getHash(tokenId);
        const boxes = 12;

        const accent = this.getTokenAccentColor(hash);
        const colors = this.divideRGB(accent, boxes);
        const miniboxXScale = Math.min(Math.max(hash[14] / 255, 0.35), 0.65);
        const miniboxYScale = Math.min(Math.max(hash[15] / 255, 0.35), 0.65);
        const miniboxAXScale = (1 - (hash[17] / 255) * 2) / 40;
        const miniboxAYScale = (1 - (hash[19] / 255) * 2) / 10;
        const rotationInit = this.getInitalDegRotation(hash);
        const rotationAdd = this.getAddDegRotation(hash) / 45.0;

        let currentRotation = rotationInit, currentXScale = miniboxXScale, currentYScale = miniboxYScale;
        for (let i = 0; i < boxes; i++) {
            let e = document.createElement("div");
            let color = colors[i];

            e.style.position = "absolute";
            e.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            e.style.left = ((currentXScale - miniboxWidthScale / 2) * width) + "px";
            e.style.top = ((currentYScale - miniboxWidthScale / 2) * height) + "px";
            e.style.width = (miniboxWidthScale * width) + "px";
            e.style.height = (miniboxHeightScale * height) + "px";
            e.style.rotate = currentRotation + "deg";

            currentRotation += rotationAdd;
            currentXScale += miniboxAXScale;
            currentYScale += miniboxAYScale;
            element.appendChild(e);
        }
    }

}