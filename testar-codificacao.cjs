const fs = require("fs");
const crypto = require("crypto");

const path = "prisma/migrations/20261106010000_adiciona_checkout_key/migration.sql";
const content = fs.readFileSync(path, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

const variants = {
  LF: content,
  CRLF: content.replace(/\n/g, "\r\n"),
  BOM_LF: "\uFEFF" + content,
  BOM_CRLF: "\uFEFF" + content.replace(/\n/g, "\r\n")
};

for (const [name, value] of Object.entries(variants)) {
  const hash = crypto.createHash("sha256").update(value, "utf8").digest("hex");
  console.log(name + ": " + hash);
}
