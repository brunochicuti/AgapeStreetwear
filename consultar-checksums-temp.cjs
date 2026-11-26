const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT migration_name, checksum, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name IN (
      '20261106010000_adiciona_checkout_key',
      '20261116170000_adicionar_token_acompanhamento',
      '20261121174000_adicionar_notificacoes_whatsapp',
      '20261122230000_separar_status_pagamento_entrega'
    )
    ORDER BY migration_name
  `);

  console.table(rows);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
