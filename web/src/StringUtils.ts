export namespace StringUtils {

    const HEX = "0123456789abcdef";

    export function hexString(arr: Uint8Array) {
        let out = "";
        for (let i = 0; i < arr.length; i++) out += HEX[arr[i] >> 4] + HEX[arr[i] & 0x0F];
        return out;
    }

}