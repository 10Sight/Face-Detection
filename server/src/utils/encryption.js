import crypto from "crypto";
import env from "../configs/env.config.js";

const algorithm = "aes-256-cbc";
const { aesSecret } = env;

if (!aesSecret) {
    throw new Error("AES_SECRET is not defined in environment");
}

const key = crypto
    .createHash("sha256")
    .update(String(aesSecret))
    .digest();

const encrypt = (text) => {
    if (!text) throw new Error("Text is required for encryption");

    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (encryptedText) => {
    if (!encryptedText) throw new Error("Encrypted text is required");

    const parts = encryptedText.split(":");
    if (parts.length !== 2) {
        throw new Error("Invalid encrypted text format");
    }

    const [ivHex, encryptedData] = parts;
    const iv = Buffer.from(ivHex, "hex");

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
};

export { encrypt, decrypt };