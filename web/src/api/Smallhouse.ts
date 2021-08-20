import * as ethers from "ethers";
import EventEmitter = require("events");
import { ContractTheme } from "../contracts/ContractTheme";
import { DarkForestArtifactContract } from "../contracts/DarkForestArtifactContract";
import { StringUtils } from "../StringUtils";
import { Marketplace } from "./Marketplace";
import { NetworkInfo } from "./NetworkInfo";
import { NetworksMap } from "./NetworksMap";

export class Smallhouse extends EventEmitter {

    /** Marketplace verified contract code hash. The binary is compiled with Remix IDE */
    static readonly MARKET_CONTRACT_SHA256 = "c183cd3a86c6165c5bd4318643950d7326573411bc864f8aab09c0335514554c";

    provider: ethers.providers.Web3Provider;
    get signer() { return this.provider?.getSigner() };

    chainId: number = -1;
    get connectionState() { return this.chainId != -1; }

    get networkInfo(): NetworkInfo { return NetworksMap[this.chainId]; }
    activeAddress: string;
    balance: ethers.BigNumber = ethers.BigNumber.from("0");
    get featuredMarketplaces() { return this.networkInfo.featuredMarketplaces ?? []; }

    constructor() {
        super();
        this.on("address-change", async address => {
            console.log("Address changed: " + address);
            this.balance = await this.signer.getBalance();
            this.emit("balance-change", this.balance);
        });
        this.on("connect", () => { console.log("Connected to Web3"); });
        this.on("disconnect", () => {
            console.log("Disconnected from Web3");
            this.chainId = -1;
        });
        this.on("balance-change", bal => { console.log("Balance changed"); });

        this.initWeb3();
    }

    async initWeb3() {
        if (this.provider) return;

        //@ts-ignore
        this.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
        this.initProvider();

        try {
            this.activeAddress = await this.signer.getAddress();
            this.emit("connect");
            this.emit("address-change", this.activeAddress);
        } catch (e) {
            console.warn(e);
            console.warn("Cannot get address: Look like you're not connected :(");
        }

        window.addEventListener("focus", async () => {
            try {
                await this.provider.getNetwork();

                let newAddress = await this.signer.getAddress();
                let oldAddress = this.activeAddress;
                this.activeAddress = newAddress;
                if (!oldAddress) this.emit("connect");
                if (oldAddress != newAddress) {
                    this.emit("address-change", this.activeAddress);
                    return;
                }

                let newBalance = await this.signer.getBalance();
                if (!newBalance.eq(this.balance)) {
                    this.balance = newBalance;
                    this.emit("balance-change", newBalance);
                }
            } catch (e) {
                if (this.activeAddress != null) this.emit("disconnect");
                this.activeAddress = null;
                console.warn(e);
            }
        });
    }

    async connectWeb3() {
        await this.provider.send("eth_requestAccounts", []);
    }

    initProvider() {
        this.provider.on("network", (newNetwork, oldNetwork) => {
            console.log("Network changed: ", newNetwork, oldNetwork);
            this.chainId = newNetwork.chainId;
            this.emit("network-change", this.networkInfo);
        });
    }

    async sha256(data: Uint8Array | string) {
        let e: ArrayBuffer;
        if (typeof data == "string") e = await new Blob([data]).arrayBuffer();
        return await crypto.subtle.digest("sha-256", e);
    }

    async contractHash(address: string) {
        let code = await this.provider.getCode(address);
        return await this.sha256(code);
    }

    async isMarketplaceVerified(contractAddress: string) {
        return Smallhouse.MARKET_CONTRACT_SHA256 == StringUtils.hexString(new Uint8Array(await this.contractHash(contractAddress)));
    }

    async tokenOwner(contract: string, tokenId: ethers.BigNumber) {
        let abi = ["function ownerOf(uint256 _tokenId) external view returns (address)"];
        let contractObj = new ethers.Contract(contract, abi, this.provider);
        return await contractObj.functions["ownerOf"](tokenId);
    }

    async checkApproval(contract: string, tokenId: ethers.BigNumber) {
        let abi = ["function getApproved(uint256 tokenId) public view returns (address)"];
        let contractObj = new ethers.Contract(contract, abi, this.signer);
        return await contractObj.functions["getApproved"](tokenId) as string;
    }

    async approveToken(contract: string, toAddress: string, tokenId: ethers.BigNumber) {
        let abi = ["function approve(address to, uint256 tokenId) public"];
        let contractObj = new ethers.Contract(contract, abi, this.signer);
        await contractObj.functions["approve"](toAddress, tokenId);
    }

    getMarketplace(contractAddress: string) { return new Marketplace(this, contractAddress); }

}

export interface Smallhouse extends EventEmitter {
    on(event: "address-change", listener: (address: string) => any): any;
    on(event: "network-change", listener: (network: NetworkInfo) => any): any;
    on(event: "connect", listener: () => any): any;
    on(event: "disconnect", listener: () => any): any;
    on(event: "balance-change", listener: (newBalance: ethers.BigNumber) => any): any;
}