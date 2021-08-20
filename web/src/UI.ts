import { BigNumber, ethers } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { FeaturedMarketplace } from "./api/FeaturedMarketplace";
import { Marketplace } from "./api/Marketplace";
import { Smallhouse } from "./api/Smallhouse";
import { TokenListingEntry } from "./api/TokenListingEntry";
import { HistoryState } from "./HistoryState";
import { QuickElements } from "./QuickElements";
import { StringUtils } from "./StringUtils";

const weisForEther = BigNumber.from("1000000000000000000");

export class UI {
    body: HTMLElement;

    topbar: HTMLDivElement;
    topbarLabel: HTMLDivElement;
    topbarConnectButton: HTMLDivElement;
    topbarAddress: HTMLDivElement;
    topbarBalance: HTMLDivElement;
    topbarListToken: HTMLDivElement;

    appview: HTMLDivElement;

    marketListingView: HTMLDivElement;
    searchBar: HTMLDivElement;
    featuredLabel: HTMLDivElement;
    featuredListing: HTMLDivElement;

    marketplaceView: HTMLDivElement;
    tokenView: HTMLDivElement;
    listTokenView: HTMLDivElement;

    constructor(public readonly api: Smallhouse) {
        this.body = document.body;

        this.topbar = QuickElements.create(null, "topbar");
        this.body.appendChild(this.topbar);

        this.topbarLabel = QuickElements.label("Smallhouse", "logo-banner");
        this.topbar.append(this.topbarLabel);

        this.topbarConnectButton = QuickElements.button("Connect Wallet", "accent connect", () => {
            api.connectWeb3();
        });
        this.topbar.append(this.topbarConnectButton);

        this.topbarAddress = QuickElements.label("Wallet Address Here", "address", () => {});
        this.topbarBalance = QuickElements.label("Unknown Network", "network", () => {});
        this.topbarListToken = QuickElements.button("List Token", "", () => {
            if (this.listTokenView) return;

            window.history.pushState(<HistoryState> {
                currentPage: "list-token"
            }, "", "/listtoken");
            this.marketplaceView?.remove(); this.marketplaceView = null;
            this.tokenView?.remove(); this.tokenView = null;

            this.openListTokenView();
        });

        this.appview = QuickElements.create(null, "appview");
        this.body.appendChild(this.appview);

        this.marketListingView = QuickElements.create(null, "view marketplace-listing");
        this.appview.append(this.marketListingView);

        this.searchBar = QuickElements.create("", "searchbar");
        this.searchBar.addEventListener("paste", event => {
            event.preventDefault();
            let text = event.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
        });
        this.searchBar.addEventListener("keydown", async (event) => {
            if (event.key == "Enter") {
                event.preventDefault();
                if (ethers.utils.isAddress(this.searchBar.textContent)) try {
                    let marketplace = this.api.getMarketplace(this.searchBar.textContent);

                    window.history.pushState(<HistoryState> {
                        currentPage: "tokens-listing",
                        marketplaceAddress: marketplace.marketplaceContract
                    }, "", "/market/" + marketplace.marketplaceContract);
                    await this.openMarketplaceView(marketplace);
                } catch (e) {
                    console.error(e);
                    this.marketplaceView?.remove();
                    this.marketplaceView = null;
                }
            }
        });
        this.searchBar.addEventListener("keyup", (event) => {
            this.updateMarketplacesListings();
        });
        this.marketListingView.append(this.searchBar);

        this.featuredLabel = QuickElements.create("Not Connected :(", "featured-label");
        this.marketListingView.append(this.featuredLabel);

        this.featuredListing = QuickElements.create(null, "listing");
        this.marketListingView.append(this.featuredListing);

        api.on("connect", () => {
            this.topbarConnectButton.remove();
            this.topbar.appendChild(this.topbarAddress);
            this.topbar.appendChild(this.topbarBalance);
            this.topbar.appendChild(this.topbarListToken);
        });
        api.on("disconnect", () => {
            this.topbarAddress.remove();
            this.topbarBalance.remove();
            this.topbarListToken.remove();
            this.topbar.append(this.topbarConnectButton);
        });
        api.on("address-change", address => {
            this.topbarAddress.textContent = address.substr(0, 7) + "..." + address.substr(-5, 5);
        });
        api.on("balance-change", () => { this.updateBalance(); });
        api.on("network-change", () => {
            this.updateMarketplacesListings();
        });

        window.addEventListener("popstate", event => {
            let history: HistoryState = event.state;
            if (!history) history = {currentPage: "marketplace-listing"};
            console.log("popstate", history.currentPage);

            this.marketplaceView?.remove(); this.marketplaceView = null;
            this.tokenView?.remove(); this.tokenView = null;
            this.listTokenView?.remove(); this.listTokenView = null;

            if (history.currentPage == "marketplace-listing") {
                this.topbarLabel.textContent = "Smallhouse";
            }
            if (history.currentPage == "tokens-listing") {
                this.openMarketplaceView(new Marketplace(this.api, history.marketplaceAddress));
            }
            if (history.currentPage == "token-view") {
                let marketplace = new Marketplace(this.api, history.marketplaceAddress);
                this.openTokenView(
                    new TokenListingEntry(marketplace, history.tokenContract, BigNumber.from(history.tokenId), history.sellerAddress, BigNumber.from(history.price))
                );
            }
            if (history.currentPage == "list-token") {
                this.openListTokenView();
            }
        });
        
    }

    updateBalance() {
        let bal = this.api.balance;
        let ethers = bal.div(weisForEther);
        let weis = bal.mod(weisForEther);
        this.topbarBalance.textContent = `${ethers}.${weis.toString().padStart(18, "0").substr(0, 5)}` + " " + this.api.networkInfo.symbol;
    }

    updateMarketplacesListings() {
        while (this.featuredListing.firstChild) this.featuredListing.firstChild.remove();
        if (!this.api.networkInfo.supported) {
            this.featuredLabel.textContent = `${this.api.networkInfo.name} is not supported... yet.`;
            return;
        }

        let search = this.searchBar.textContent.trim();

        if (!this.api.connectionState) {
            this.featuredLabel.textContent = "Not Connected :(";
            return;
        }

        this.featuredLabel.textContent = "Featured Marketplaces in " + this.api.networkInfo.name;
        let filteredListing = this.api.featuredMarketplaces.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.marketplaceContract.startsWith(search) || v.tokenContract.startsWith(search));
        
        if (filteredListing.length > 0) filteredListing.forEach(e => {
            this.featuredListing.appendChild(this.createMarketplaceListingEntry(e));
        }); else {
            // Nothing -_-
        }
    }

    createMarketplaceListingEntry(entry: FeaturedMarketplace) {
        let e = QuickElements.create(null, "listing-entry");
        e.style.height = "240px";
        
        let bg = QuickElements.create(null, "listing-bg");
        bg.style.background = entry.previewBackground;
        e.appendChild(bg);

        let entryToplayer = QuickElements.create(null, "listing-toplayer");
        e.appendChild(entryToplayer);

        let name = QuickElements.label(entry.name, "name");
        entryToplayer.appendChild(name);

        let address = QuickElements.label(entry.marketplaceContract, "address");
        entryToplayer.appendChild(address);

        e.addEventListener("click", () => {
            window.history.pushState(<HistoryState> {
                currentPage: "tokens-listing",
                marketplaceAddress: entry.marketplaceContract
            }, "", "/market/" + entry.marketplaceContract);
            this.openMarketplaceView(this.api.getMarketplace(entry.marketplaceContract));
        });

        setTimeout(() => { this.api.networkInfo.tokenThemes[entry.tokenContract]?.processMarketplaceBackground(bg); });
        return e;
    }

    async openMarketplaceView(marketplace: Marketplace) {
        document.title = await marketplace.getName() + " - Smallhouse Marketplace";
        this.marketplaceView = QuickElements.create(null, "view marketplace");
        this.appview.appendChild(this.marketplaceView);

        // Too much effort for simple loading animation -_-
        let loading = QuickElements.label("Loading", "loading");
        let loadingAnimationIndex = 0;
        let loadingFinished = false;
        let task = setInterval(() => {
            if (loadingFinished) {
                clearInterval(task);
                return;
            }
            if (loadingAnimationIndex == 3) {
                loadingAnimationIndex = 0;
                loading.textContent = "Loading";
                return;
            }
            loading.textContent += ".";
            loadingAnimationIndex++;
        }, 600);
        this.marketplaceView.appendChild(loading);

        this.topbarLabel.textContent = await marketplace.getName();

        // Here goes the real loading!
        let verified = await marketplace.checkVerified();
        if (!verified) {
            let notice = QuickElements.label([
                "This marketplace is not verified!",
                "",
                "This marketplace contract was compiled with different code",
                "This code might be able to steal your assets",
                "",
                "Please check the code before you approve token spend limit for this contract",
                "Click the button below to continue",
                "Contract Code SHA-256: " + StringUtils.hexString(new Uint8Array((await this.api.contractHash(marketplace.marketplaceContract))))
            ].join("\r\n"), "notice");
            this.marketplaceView.append(notice);

            let continueButton = QuickElements.button("Continue Anyways", "accent notice-continue");
            this.marketplaceView.append(continueButton);

            loading.remove();
            await new Promise<void>(resolve => {
                continueButton.addEventListener("click", () => { resolve(); });
            });
            notice.remove();
            continueButton.remove();
            this.marketplaceView.append(loading);
        }

        let searchbar = QuickElements.create(null, "searchbar in-marketplace");
        let listing = await marketplace.fetchListedTokens();
        
        searchbar.addEventListener("paste", event => {
            event.preventDefault();
            let text = event.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
        });

        searchbar.addEventListener("keyup", () => {
            let keyword = searchbar.textContent;
            while (tokensListingView.firstChild) tokensListingView.firstChild.remove();
            listing.filter(v => v.tokenId.toString().startsWith(keyword) || v.displayName.toLowerCase().includes(keyword.toLowerCase()) || v.sellerAddress.startsWith(keyword)).forEach(e => {
                tokensListingView.append(this.createTokenListingEntry(e));
            });
        });
        
        loading.remove();
        this.marketplaceView.append(searchbar);

        let tokensListingView = QuickElements.create(null, "listing");
        this.marketplaceView.append(tokensListingView);

        listing.forEach(e => {
            tokensListingView.append(this.createTokenListingEntry(e));
        });

        marketplace.contract.on("TokenListed", (tokenId: BigNumber, seller: string, price: BigNumber) => {
            let token = new TokenListingEntry(
                marketplace,
                marketplace.tokenContract,
                tokenId, seller, price
            );
            listing.push(token);
            tokensListingView.append(this.createTokenListingEntry(token));
        });
    }

    createTokenListingEntry(entry: TokenListingEntry) {
        let e = QuickElements.create(null, "listing-entry");
        let displayName = entry.displayName;

        let bg = QuickElements.create(null, "listing-bg");
        bg.style.background = "";
        e.appendChild(bg);

        let entryToplayer = QuickElements.create(null, "listing-toplayer");
        e.appendChild(entryToplayer);

        let name = QuickElements.label(displayName, "name");
        entryToplayer.appendChild(name);

        let description = QuickElements.label("(no description)", "description");
        if (entry.theme) entry.theme.processPreviewDescription(description, entry.tokenId);
        entryToplayer.appendChild(description);

        let address = QuickElements.label("Seller: " + entry.sellerAddress, "address");
        entryToplayer.appendChild(address);

        let price = QuickElements.create(formatEther(entry.price) + " " + this.api.networkInfo.symbol, "price");
        e.appendChild(price);

        e.addEventListener("click", async () => {
            window.history.pushState(<HistoryState> {
                currentPage: "token-view",
                marketplaceAddress: entry.marketplace.marketplaceContract,
                tokenContract: entry.tokenContract,
                sellerAddress: entry.sellerAddress,
                price: entry.price.toString(),
                tokenId: entry.tokenId.toString()
            }, "", "/market/" + entry.marketplace.marketplaceContract + "/" + entry.tokenId);
            this.marketplaceView?.remove();
            this.marketplaceView = null;
            this.openTokenView(entry);
        });

        setTimeout(() => {
            this.api.networkInfo.tokenThemes[entry.tokenContract]?.processTokenBackground(bg, entry.tokenId)
        });
        return e;
    }

    async openTokenView(token: TokenListingEntry) {
        this.topbarLabel.textContent = token.displayName;
        document.title = token.displayName + " - Smallhouse Marketplace";

        this.tokenView = QuickElements.create(null, "view token");
        this.appview.appendChild(this.tokenView);

        let tokenInfo = QuickElements.create(null, "token-info");
        this.tokenView.appendChild(tokenInfo);

        let tokenImage = QuickElements.create(null, "token-image");
        tokenInfo.appendChild(tokenImage);
        token.theme?.processTokenBackground(tokenImage, token.tokenId);

        let tokenMetadata = QuickElements.create(null, "token-metadata");
        tokenInfo.appendChild(tokenMetadata);

        let tokenName = QuickElements.label(token.displayName, "name");
        tokenMetadata.appendChild(tokenName);

        let tokenSeller = QuickElements.label("Seller: " + token.sellerAddress, "seller");
        tokenMetadata.appendChild(tokenSeller);

        let tokenId = QuickElements.label("Token ID: " + token.tokenId.toString(), "id");
        tokenMetadata.appendChild(tokenId);

        let tokenIdHex = QuickElements.label("Token ID (Hex): " + token.tokenId.toHexString(), "id");
        tokenMetadata.appendChild(tokenIdHex);

        let tokenDescription = QuickElements.label("(no description)", "description");
        this.tokenView.appendChild(tokenDescription);
        token.theme.processFullDescription(tokenDescription, token.tokenId);

        let unlist: HTMLDivElement, buy: HTMLDivElement;
        token.marketplace.contract.on("TokenUnlisted", (tokenId: BigNumber) => {
            if (token.tokenId.eq(tokenId)) {
                let button = unlist || buy;
                button.textContent = "Token Unlisted!";
            }
        });
        token.marketplace.contract.on("TokenPurchased", (tokenId: BigNumber) => {
            if (token.tokenId.eq(tokenId)) {
                let button = unlist || buy;
                button.textContent = "Token Purchased!";
            }
        });

        token.fetchListingStatus().then(result => {
            if (!result) {
                let sold = QuickElements.button("Token Sold/Unlisted!", "");
                tokenMetadata.appendChild(sold);
            } else {
                let ev;
                if (token.sellerAddress == this.api.activeAddress) {
                    unlist = QuickElements.button("Unlist Token", "", ev = () => {
                        token.unlist().then(() => {
                            unlist.removeEventListener("click", ev);
                        }).catch(() => {
                            unlist.textContent = "Unlist Failed. Try Again?";
                        });
                    });
                    tokenMetadata.appendChild(unlist);
                } else {
                    buy = QuickElements.button(`Buy Token for ${formatEther(token.price)} ${this.api.networkInfo.symbol}`, "accent", ev = () => {
                        buy.textContent = "Processing...";
                        token.purchase().then(() => {
                            buy.removeEventListener("click", ev);
                        }).catch(() => {
                            buy.textContent = "Buy Failed. Try Again?";
                        });
                    });
                    tokenMetadata.appendChild(buy);
                }
            }
        });
    }

    async openListTokenView() {
        document.title = "List Token - Smallhouse Marketplace";
        this.topbarLabel.textContent = "List Token To Marketplace";
        this.listTokenView = QuickElements.create(null, "view list-token");
        this.appview.appendChild(this.listTokenView);

        function validate(textbox: HTMLDivElement, noteElement: HTMLDivElement, validator: (input: string) => any) {
            textbox.addEventListener("paste", event => {
                event.preventDefault();
                let text = event.clipboardData.getData("text/plain");
                document.execCommand("insertText", false, text);
            });
            textbox.addEventListener("keyup", () => {
                let result = validator(textbox.textContent);
                if (typeof result == "string") {
                    noteElement.textContent = result;
                    noteElement.style.color = "#ff5555";
                } else {
                    noteElement.textContent = "Valid Input!";
                    noteElement.style.color = "#22ff77";
                }
            });
        }

        let contractAddress: HTMLDivElement, contractAddressNote: HTMLDivElement;
        let tokenContractAddressNote: HTMLDivElement;
        let verifyButton: HTMLDivElement;
        let tokenId: HTMLDivElement, tokenIdNote: HTMLDivElement;
        let confirmOwnerButton: HTMLDivElement;
        let tokenOwnerNote: HTMLDivElement;
        let approveButton: HTMLDivElement;
        let price: HTMLDivElement;
        let listButton: HTMLDivElement;

        this.listTokenView.appendChild(QuickElements.create("Follow these steps to get your token listed in marketplace:", "title"));
        this.listTokenView.appendChild(QuickElements.create("0. Make sure you're using right wallet", "step"));
        this.listTokenView.appendChild(QuickElements.create("Your Wallet: " + this.api.activeAddress, "note"));

        this.listTokenView.appendChild(QuickElements.create("1. Type marketplace contract address below:", "step"));
        this.listTokenView.appendChild(contractAddress = QuickElements.create(null, "textbox"));
        this.listTokenView.appendChild(contractAddressNote = QuickElements.create("Must be '0x' prefixed", "note"));
        validate(contractAddress, contractAddressNote, input => {
            if (!input.startsWith("0x")) return "Must starts with '0x' prefix";
            if (input.length < 42) return "Input address length is less than 42 characters";
            if (!ethers.utils.isAddress(input)) return "Invalid address";
        });

        this.listTokenView.appendChild(QuickElements.create("1.1. (Optional) Verify marketplace before continue", "step"));
        this.listTokenView.appendChild(QuickElements.create("Marketplace that's failed to pass this test might be able to steal your assets when you list your token", "note"));
        this.listTokenView.appendChild(QuickElements.create("However, you can still continue if it failed the test", "note"));
        this.listTokenView.appendChild(tokenContractAddressNote = QuickElements.create("Token Contract Address: n/a", "note"));
        this.listTokenView.appendChild(verifyButton = QuickElements.button("Verify Marketplace", "accent", async () => {
            verifyButton.textContent = "Verifying...";
            verifyButton.classList.remove("accent");
            try {
                let status = await this.api.isMarketplaceVerified(contractAddress.textContent);
                if (status) {
                    verifyButton.textContent = "Verification Passed! ^.^";
                    tokenContractAddressNote.textContent = "Token Contract Address: " + await this.api.getMarketplace(contractAddress.textContent).getTokenContractAddress();
                } else {
                    verifyButton.textContent = "Verification Failed";
                    verifyButton.classList.add("accent");
                }
            } catch (e) {
                console.log(e);
                verifyButton.classList.add("accent");
                verifyButton.textContent = "Failed to verify marketplace :(. Try again?";
            }
        }));

        this.listTokenView.appendChild(QuickElements.create("2. Type token ID below:", "step"));
        this.listTokenView.appendChild(tokenId = QuickElements.create(null, "textbox"));
        this.listTokenView.appendChild(tokenIdNote = QuickElements.create("Default is decimal, '0x' prefix for hex", "note"));
        validate(tokenId, tokenIdNote, input => {
            let num: BigNumber;
            try { num = BigNumber.from(input); } catch (e) { return "Invalid token ID" };
        });
        
        this.listTokenView.appendChild(QuickElements.create("2.1. (Optional) Confirm that you are the owner of this token", "step"));
        this.listTokenView.appendChild(QuickElements.create("In order to list token on Smallhouse, you must own this token", "note"));
        this.listTokenView.appendChild(QuickElements.create("If you don't own this token, you won't be able to list this token on marketplace", "note"));
        this.listTokenView.appendChild(QuickElements.create("Approve token spend limit won't work so don't even try", "note"));
        this.listTokenView.appendChild(tokenOwnerNote = QuickElements.create("Token Owner: n/a", "note"));
        this.listTokenView.appendChild(confirmOwnerButton = QuickElements.button("Check Token Owner", "accent", async () => {
            confirmOwnerButton.textContent = "Confirming...";
            confirmOwnerButton.classList.remove("accent");
            try {
                let tokenContract = await this.api.getMarketplace(contractAddress.textContent).getTokenContractAddress();
                let owner = await this.api.tokenOwner(tokenContract, BigNumber.from(tokenId.textContent));
                tokenOwnerNote.textContent = "Token Owner: " + owner;
                if (owner == this.api.activeAddress) {
                    confirmOwnerButton.textContent = "You're the owner ^.^";
                } else {
                    confirmOwnerButton.classList.add("accent");
                    confirmOwnerButton.textContent = "You're not the owner :(";
                }
            } catch (e) {
                console.error(e);
                confirmOwnerButton.classList.add("accent");
                confirmOwnerButton.textContent = "Failed to check token owner :(. Try again?";
            }
        }));

        this.listTokenView.appendChild(QuickElements.create("3. Approve Marketplace to take your token", "step"));
        this.listTokenView.appendChild(QuickElements.create("To list your token, you'll need to approve marketplace to take your token away", "note"));
        this.listTokenView.appendChild(QuickElements.create("Click the button below to approve", "note"));
        this.listTokenView.appendChild(QuickElements.create("Please check the marketplace contract code carefully, as it might contains code to steal your tokens (It must pass the verification above at least)", "note"));
        this.listTokenView.appendChild(approveButton = QuickElements.button("Approve", "accent", async () => {
            approveButton.textContent = "Waiting for signature...";
            approveButton.classList.remove("accent");
            try {
                let tokenIdbn = BigNumber.from(tokenId.textContent);
                let tokenContract = await this.api.getMarketplace(contractAddress.textContent).getTokenContractAddress();
                let approved = await this.api.checkApproval(tokenContract, tokenIdbn);
                if (approved != contractAddress.textContent) await this.api.approveToken(tokenContract, contractAddress.textContent, BigNumber.from(tokenId.textContent));
                else {
                    approveButton.textContent = "Approved!";
                    return;
                }
                approveButton.textContent = "Approving...";

                let taskLoop = setInterval(async () => {
                    let currentApproved = await this.api.checkApproval(tokenContract, tokenIdbn);
                    if (currentApproved == contractAddress.textContent) {
                        clearInterval(taskLoop);
                        approveButton.textContent = "Approved!";
                    }
                }, 3000);
            } catch (e) {
                console.error(e);
                approveButton.textContent = "Failed to approve. Try again?";
                approveButton.classList.add("accent");
            }
        }));

        this.listTokenView.appendChild(QuickElements.create("4. List your token to marketplace", "step"));
        this.listTokenView.appendChild(QuickElements.create("Type the price for your token below, then click 'List Token' and get rich!", "note"));
        this.listTokenView.appendChild(price = QuickElements.create("1.0", "textbox"));
        this.listTokenView.appendChild(QuickElements.create("The unit is always in Ether (" + this.api.networkInfo.symbol + ")", "note"));
        this.listTokenView.appendChild(listButton = QuickElements.button("List Token", "accent", async () => {
            listButton.classList.remove("accent");
            listButton.textContent = "Waiting for signature...";
            try {
                let marketplace = this.api.getMarketplace(contractAddress.textContent);
                let tokenIdbn = BigNumber.from(tokenId.textContent);
                let pricebn = ethers.utils.parseEther(price.textContent);
                await marketplace.listToken(tokenIdbn, pricebn);
                listButton.textContent = "Listing Token...";

                marketplace.contract.on("TokenListed", (tokenId: BigNumber, seller: string, price: BigNumber) => {
                    if (tokenId.eq(tokenIdbn) && seller == this.api.activeAddress) {
                        listButton.textContent = "Token Listed!";
                    }
                });
            } catch (e) {
                console.error(e);
                listButton.textContent = "Failed to list token. Try again?";
                listButton.classList.add("accent");
            }
        }));

        listButton.style.marginBottom = "24px";
    }

}
