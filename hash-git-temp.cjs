const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");

const arquivo = "prisma/migrations/20261106010000_adiciona_checkout_key/migration.sql";

const conteudo = execFileSync("git", [
  "show",
  `6919f16:${arquivo}`
]);

console.log("SHA256 da versão no Git:");
console.log(createHash("sha256").update(conteudo).digest("hex"));
