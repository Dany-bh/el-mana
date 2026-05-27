import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all products grouped by category
router.get('/menu', async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { products: true }
  });
  res.json(categories);
});

// Get all tables
router.get('/tables', async (req, res) => {
  const tables = await prisma.table.findMany({
    orderBy: { number: 'asc' }
  });
  res.json(tables);
});

// Auth Login
router.post('/auth/login', async (req, res) => {
  const { pin } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { pin }
    });
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'PIN incorrecto' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// Get all pending and ready orders
router.get('/orders/active', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['PENDIENTE', 'LISTO'] } },
      include: {
        orderItems: {
          include: {
            product: {
              include: { category: true }
            }
          }
        },
        table: true,
        waiter: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Formatear para el frontend
    const formattedOrders = orders.map(order => ({
      id: order.id,
      tableId: order.tableId,
      tableNumber: order.table.number,
      floor: order.floor,
      waiterId: order.waiterId,
      waiterName: order.waiterName || order.waiter.name,
      createdAt: order.createdAt,
      status: order.status,
      total: order.total,
      items: order.orderItems.map(oi => ({
        id: oi.id,
        productId: oi.productId,
        name: oi.product.name,
        size: oi.product.size,
        price: oi.product.price,
        quantity: oi.quantity,
        notes: oi.notes,
        status: oi.status,
        categoryName: oi.product.category?.name || ""
      }))
    }));

    res.json(formattedOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Finalize orders and free table
router.post('/tables/:id/checkout', async (req, res) => {
  const { id } = req.params;
  const { floor } = req.body;
  const floorInt = parseInt(floor) || 1;
  try {
    // 1. Mark all PENDIENTE/LISTO orders of this table on this floor as FINALIZADO
    await prisma.order.updateMany({
      where: {
        tableId: id,
        floor: floorInt,
        status: { in: ['PENDIENTE', 'LISTO'] }
      },
      data: { status: 'FINALIZADO' }
    });

    // 2. Check if there are any remaining active orders on other floors for this physical table
    const remainingActiveOrdersCount = await prisma.order.count({
      where: {
        tableId: id,
        status: { in: ['PENDIENTE', 'LISTO'] }
      }
    });

    if (remainingActiveOrdersCount === 0) {
      await prisma.table.update({
        where: { id },
        data: { status: 'LIBRE' }
      });
      // Notificar cambio de estado físico de mesa
      const io = req.app.get('io');
      if (io) {
        io.emit('table_status_updated', { tableId: id, status: 'LIBRE' });
      }
    }

    // Emitir evento de socket para sincronización en tiempo real
    const io = req.app.get('io');
    if (io) {
      io.emit('table_checked_out', { tableId: id, floor: floorInt });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consolidar consumos de la mesa e imprimir boleta/factura en POS
router.post('/tables/:id/print-bill', async (req, res) => {
  const { id } = req.params;
  const { type, docNumber, customerName, floor } = req.body;
  const floorInt = parseInt(floor) || 1;
  
  try {
    // 1. Obtener órdenes activas (PENDIENTE o LISTO) de esta mesa en este piso
    const orders = await prisma.order.findMany({
      where: {
        tableId: id,
        floor: floorInt,
        status: { in: ['PENDIENTE', 'LISTO'] }
      },
      include: {
        orderItems: {
          include: { product: true }
        },
        waiter: true,
        table: true
      }
    });

    if (orders.length === 0) {
      return res.status(400).json({ error: `No hay consumos activos para esta mesa en el Piso ${floorInt}.` });
    }

    // 2. Consolidar ítems del pedido (agrupar repetidos si se pidieron por partes)
    const consolidatedMap = {};
    let total = 0;
    let waiterName = orders[0].waiterName || orders[0].waiter.name;
    let tableNumber = orders[0].table.number;

    orders.forEach(order => {
      order.orderItems.forEach(oi => {
        const key = `${oi.productId}-${oi.notes || ''}`;
        if (!consolidatedMap[key]) {
          consolidatedMap[key] = {
            name: oi.product.name,
            size: oi.product.size,
            price: oi.product.price,
            quantity: 0,
            notes: oi.notes
          };
        }
        consolidatedMap[key].quantity += oi.quantity;
        total += oi.quantity * oi.product.price;
      });
    });

    const items = Object.values(consolidatedMap);

    // 3. Invocar al servicio de impresión
    const { printBillTicket } = await import('../services/printer.service.js');
    await printBillTicket(tableNumber, waiterName, items, total, type || 'BOLETA', docNumber, customerName, floorInt);

    res.json({ success: true, message: `${type} enviada a la ticketera POS con éxito.` });
  } catch (err) {
    console.error('[Printer Endpoint] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update table status
router.patch('/tables/:id', async (req, res) => {
  const { status } = req.body;
  const table = await prisma.table.update({
    where: { id: req.params.id },
    data: { status }
  });
  res.json(table);
});

// Update user name
router.post('/auth/update-name', async (req, res) => {
  const { userId, name } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name }
    });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
