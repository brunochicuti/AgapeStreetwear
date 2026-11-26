require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const crypto = require("crypto");

const db = new PrismaClient();

const migrations = [
  "20261106010000_adiciona_checkout_key",
  "20261116170000_adicionar_token_acompanhamento",
  "20261121174000_adicionar_notificacoes_whatsapp",
  "20261122230000_separar_status_pagamento_entrega"
];

async function main() {
  const rows = await db.$queryRaw`
    SELECT migration_name, checksum, started_at
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL
      AND rolled_back_at IS NULL
      AND migration_name IN (
        '20261106010000_adiciona_checkout_key',
        '20261116170000_adicionar_token_acompanhamento',
        '20261121174000_adicionar_notificacoes_whatsapp',
        '20261122230000_separar_status_pagamento_entrega'
      )
    ORDER BY started_at
  `;

  for (const name of migrations) {
    const content = fs.readFileSync(
      `prisma/migrations/${name}/migration.sql`
    );

    const hash = crypto
      .createHash("sha256")
      .update(content)
      .digest("hex");

    const successful = rows.filter(r => r.migration_name === name);

    console.log("\nMigração:", name);
    console.log("Arquivo atual:", hash);

    for (const row of successful) {
      console.log("Banco (execução concluída):", row.checksum);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
