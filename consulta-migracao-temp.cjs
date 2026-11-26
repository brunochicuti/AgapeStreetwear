const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

prisma.$queryRawUnsafe(
  'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = $1',
  "20261125140000_adicionar_cor_tamanho_pedido"
)
.then(console.log)
.catch(console.error)
.finally(() => prisma.$disconnect());
