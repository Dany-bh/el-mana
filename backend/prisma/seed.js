import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Admin (always needed, safety net)
  const admin = await prisma.user.upsert({
    where: { pin: '1234' },
    update: {},
    create: { name: 'Admin', pin: '1234', role: 'ADMIN' },
  });

  // Create default Mozo and Cocina only if this is a fresh database (only Admin exists)
  const userCount = await prisma.user.count();
  if (userCount <= 1) {
    await prisma.user.upsert({
      where: { pin: '0001' },
      update: {},
      create: { name: 'Juan Mozo', pin: '0001', role: 'MOZO' },
    });

    await prisma.user.upsert({
      where: { pin: '8888' },
      update: {},
      create: { name: 'Chef Mario', pin: '8888', role: 'COCINA' },
    });
    console.log('Fresh database: seeded default waiter and kitchen accounts.');
  } else {
    console.log('Skipping default accounts seeding to protect user deletions.');
  }

  // Create Tables
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { number: i },
      update: {},
      create: { number: i, status: 'LIBRE' },
    });
  }

  // Create Categories and Products only if empty
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    const catBebidas = await prisma.category.create({ data: { name: 'Bebidas' } });
    const catComida = await prisma.category.create({ data: { name: 'Comida' } });

    // Create Products
    await prisma.product.createMany({
      data: [
        { name: 'Inca Kola', size: '2 Litros', price: 13, categoryId: catBebidas.id },
        { name: 'Inca Kola', size: '1 Litro', price: 10, categoryId: catBebidas.id },
        { name: 'Inca Kola', size: '500 ml (Gordita)', price: 6, categoryId: catBebidas.id },
        { name: 'Inca Kola', size: 'Personal', price: 3, categoryId: catBebidas.id },
        { name: 'Coca Cola', size: '2 Litros', price: 13, categoryId: catBebidas.id },
        { name: 'Coca Cola', size: '1 Litro', price: 10, categoryId: catBebidas.id },
        { name: 'Coca Cola', size: '500 ml (Gordita)', price: 6, categoryId: catBebidas.id },
        { name: 'Coca Cola', size: 'Personal', price: 3, categoryId: catBebidas.id },
        { name: 'Cerveza Pilsen', size: '1 Litro', price: 12, categoryId: catBebidas.id },
        { name: 'Hamburguesa Completa', price: 15, categoryId: catComida.id },
        { name: 'Pizza Familiar', price: 35, categoryId: catComida.id },
        { name: 'Papas Fritas', price: 8, categoryId: catComida.id },
      ],
    });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
