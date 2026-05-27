import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const tables = await prisma.table.findMany();
  console.log('TABLES IN DB:', tables);
}
main().catch(console.error).finally(() => prisma.$disconnect());
