const crypto = require("crypto");

const algorithm = "aes-256-cbc";

// Ensure the key is exactly 32 bytes and is set
let secretKey = process.env.ENCRYPTION_KEY;
if (!secretKey) {
  throw new Error("ENCRYPTION_KEY environment variable is not set.");
}
if (secretKey.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be exactly 32 characters long (256 bits for AES-256)");
}
secretKey = Buffer.from(secretKey, "utf8");

function encrypt(text) {
  const iv = crypto.randomBytes(16); // Unique IV for each message
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(text) {
  const [ivHex, encryptedText] = text.split(":");
  if (!ivHex || !encryptedText) {
    console.error('Malformed encrypted text:', text);
    throw new Error('Malformed encrypted text');
  }
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };
