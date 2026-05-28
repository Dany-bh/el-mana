import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Helper para limpiar datos del frontend (quitar relaciones anidadas)
const sanitize = (data) => {
  const clean = { ...data };
  delete clean.id;
  delete clean.category;
  delete clean.products;
  delete clean.orders;
  delete clean.orderItems;
  delete clean.waiter;
  delete clean.table;
  return clean;
};

// --- CATEGORIES ---
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ include: { products: true } });
    res.json(categories);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/categories', async (req, res) => {
  try {
    const category = await prisma.category.create({ data: sanitize(req.body) });
    res.json(category);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: sanitize(req.body)
    });
    res.json(category);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: err.message }); 
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { 
    console.error('[Admin] Error deleting category:', err);
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'No se puede eliminar la categoría porque tiene productos asociados.' });
    }
    res.status(500).json({ error: 'Error al eliminar la categoría' }); 
  }
});

// --- PRODUCTS ---
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ include: { category: true } });
    res.json(products);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/products', async (req, res) => {
  try {
    const product = await prisma.product.create({ data: sanitize(req.body) });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: sanitize(req.body)
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { 
    console.error('[Admin] Error deleting product:', err);
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'No se puede eliminar el producto porque está incluido en pedidos existentes.' });
    }
    res.status(500).json({ error: 'Error al eliminar el producto' }); 
  }
});

// --- TABLES ---
router.get('/tables', async (req, res) => {
  try {
    const tables = await prisma.table.findMany({ orderBy: { number: 'asc' } });
    res.json(tables);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/tables', async (req, res) => {
  try {
    const table = await prisma.table.create({ data: sanitize(req.body) });
    res.json(table);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/tables/:id', async (req, res) => {
  try {
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: sanitize(req.body)
    });
    res.json(table);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/tables/:id', async (req, res) => {
  try {
    await prisma.table.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- USERS ---
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/users', async (req, res) => {
  try {
    const user = await prisma.user.create({ data: sanitize(req.body) });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: sanitize(req.body)
    });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { 
    console.error('[Admin] Error deleting user:', err);
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'No se puede eliminar el usuario porque tiene pedidos o historial asociado.' });
    }
    res.status(500).json({ error: 'Error al eliminar el usuario' }); 
  }
});

// --- SALES SUMMARY (CAJA) ---
router.get('/sales', async (req, res) => {
  try {
    const completedOrders = await prisma.order.findMany({
      where: { status: 'FINALIZADO' },
      include: {
        orderItems: {
          include: { product: true }
        },
        table: true,
        waiter: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalSales = completedOrders.reduce((acc, order) => acc + order.total, 0);
    const totalOrdersCount = completedOrders.length;

    const productSalesMap = {};
    completedOrders.forEach(order => {
      order.orderItems.forEach(oi => {
        const key = oi.productId;
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            name: oi.product.name,
            size: oi.product.size,
            quantity: 0,
            price: oi.product.price,
            total: 0
          };
        }
        productSalesMap[key].quantity += oi.quantity;
        productSalesMap[key].total += oi.quantity * oi.product.price;
      });
    });

    const productSales = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);

    res.json({
      totalSales,
      totalOrdersCount,
      completedOrders: completedOrders.map(o => ({
        id: o.id,
        tableNumber: o.table.number,
        waiterName: o.waiter.name,
        total: o.total,
        createdAt: o.createdAt,
        items: o.orderItems.map(oi => ({
          name: oi.product.name,
          size: oi.product.size,
          price: oi.product.price,
          quantity: oi.quantity
        }))
      })),
      productSales
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RESET / CLEAR HISTORY ---
router.post('/reset-daily', async (req, res) => {
  try {
    console.log('[Admin] Request received: reset-daily');
    // Primero intentamos borrar los items de las órdenes que vamos a borrar
    const ordersToDelete = await prisma.order.findMany({
      where: { status: 'FINALIZADO' },
      select: { id: true }
    });
    
    const orderIds = ordersToDelete.map(o => o.id);
    console.log(`[Admin] Found ${orderIds.length} finished orders to delete.`);

    const result = await prisma.$transaction([
      prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } }
      }),
      prisma.order.deleteMany({
        where: { id: { in: orderIds } }
      })
    ]);

    console.log(`[Admin] Successfully deleted ${result[1].count} orders and their items.`);

    // Broadcast the action to all connected screens
    const io = req.app.get('io');
    if (io) {
      io.emit('admin_action_broadcast', {
        type: 'RESET_DAILY',
        title: '¡Día Reiniciado!',
        message: 'El Administrador ha reiniciado el día laboral. La caja de este turno se ha archivado.'
      });
    }

    res.json({ success: true, message: 'Caja del día reiniciada' });
  } catch (err) {
    console.error('[Admin] FATAL ERROR in reset-daily:', err);
    res.status(500).json({ error: 'Error interno del servidor: ' + err.message });
  }
});

router.post('/clear-kitchen-history', async (req, res) => {
  try {
    console.log('[Admin] Request received: clear-kitchen-history');
    const ordersToDelete = await prisma.order.findMany({
      where: { status: 'LISTO' },
      select: { id: true }
    });
    
    const orderIds = ordersToDelete.map(o => o.id);
    
    const result = await prisma.$transaction([
      prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } }
      }),
      prisma.order.deleteMany({
        where: { id: { in: orderIds } }
      })
    ]);

    console.log(`[Admin] Successfully cleared ${result[1].count} ready orders.`);

    // Broadcast the action to all connected screens
    const io = req.app.get('io');
    if (io) {
      io.emit('admin_action_broadcast', {
        type: 'CLEAR_KITCHEN',
        title: '¡Historial Limpiado!',
        message: 'El Administrador ha limpiado el historial de comandas despachadas en cocina.'
      });
    }

    res.json({ success: true, message: 'Historial de cocina limpiado' });
  } catch (err) {
    console.error('[Admin] FATAL ERROR in clear-kitchen-history:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/purge-all-history', async (req, res) => {
  try {
    console.log('[Admin] Request received: purge-all-history');
    const result = await prisma.$transaction([
      prisma.orderItem.deleteMany({}),
      prisma.order.deleteMany({})
    ]);
    console.log(`[Admin] Successfully purged ALL history: ${result[1].count} orders deleted.`);

    // Broadcast the action to all connected screens
    const io = req.app.get('io');
    if (io) {
      io.emit('admin_action_broadcast', {
        type: 'PURGE_ALL',
        title: '¡SISTEMA PURGADO!',
        message: '¡ATENCIÓN! El Administrador ha eliminado por completo todo el historial de ventas del sistema.'
      });
    }

    res.json({ success: true, message: 'Historial total eliminado' });
  } catch (err) {
    console.error('[Admin] FATAL ERROR in purge-all-history:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
