import "./css/index.css";

import * as packageInfo from "../package.json";
import { Smallhouse } from "./api/Smallhouse";
import { UI } from "./UI";
import { StringUtils } from "./StringUtils";

console.log(`Smallhouse v${packageInfo.version} @ ${packageInfo.targetedBranch}`);

let api = globalThis.api = new Smallhouse();
let ui = globalThis.ui = new UI(api);
globalThis.StringUtils = StringUtils;