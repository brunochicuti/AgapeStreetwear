const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

prisma.$queryRawUnsafe(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'Order'
    AND column_name IN (
      'paymentMethod',
      'paymentRecoveryTokenHash',
      'paymentRecoveryExpiresAt',
      'paymentReminderSentAt'
    )
  ORDER BY column_name
`)
.then(console.log)
.catch(console.error)
.finally(() => prisma.$disconnect());
