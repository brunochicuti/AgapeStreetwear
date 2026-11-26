require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const columns = await db.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'OrderItem'
      AND table_schema = 'public'
    ORDER BY ordinal_position
  `;
  console.log(columns);
}

main().catch(console.error).finally(() => db.$disconnect());
