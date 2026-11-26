const fs = require("fs");
const crypto = require("crypto");

const migrations = [
  "20261106010000_adiciona_checkout_key",
  "20261116170000_adicionar_token_acompanhamento",
  "20261121174000_adicionar_notificacoes_whatsapp",
  "20261122230000_separar_status_pagamento_entrega"
];

for (const name of migrations) {
  const path = `prisma/migrations/${name}/migration.sql`;
  const content = fs.readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const lf = content.replace(/\r\n/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");

  const hash = value =>
    crypto.createHash("sha256").update(value, "utf8").digest("hex");

  console.log("\n" + name);
  console.log("LF:  ", hash(lf));
  console.log("CRLF:", hash(crlf));
}
