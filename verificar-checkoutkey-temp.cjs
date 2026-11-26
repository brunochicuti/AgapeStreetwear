const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Order'
      AND column_name = 'checkoutKey'
  `);

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'Order'
      AND indexname = 'Order_checkoutKey_key'
  `);

  console.log("COLUNA:");
  console.table(rows);
  console.log("ÍNDICE:");
  console.table(indexes);
}

main().catch(console.error).finally(() => prisma.$disconnect());
