import { PrismaClient } from '@prisma/client';
import { printOrderTicket } from '../services/printer.service.js';

const prisma = new PrismaClient();

export const setupOrderSockets = (io, socket) => {
  // Cuando un mozo envía un pedido
  socket.on('send_new_order', async (orderData) => {
    try {
      // orderData: { tableId, tableNumber, waiterId, waiterName, items: [{ id, name, price, quantity, notes }], notes }
      console.log(`[Socket] Nuevo pedido recibido para mesa ${orderData.tableNumber}`);

      // Obtener categorías de los productos para clasificar bebidas y validar stock
      const productIds = orderData.items.map(item => item.id);
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { category: true }
      });

      // Validar Stock antes de proceder
      for (const item of orderData.items) {
        const dbProduct = dbProducts.find(p => p.id === item.id);
        if (dbProduct && dbProduct.stock !== -1 && dbProduct.stock < item.quantity) {
          return socket.emit('order_ack', { 
            success: false, 
            message: `Stock insuficiente para: ${dbProduct.name}. Disponible: ${dbProduct.stock}` 
          });
        }
      }

      const productCategoryMap = {};
      dbProducts.forEach(p => {
        productCategoryMap[p.id] = p.category.name;
      });

      // Determinar si un ítem es instantáneo (bebida, táper o envase que no requiere cocina)
      const isInstantItem = (productId, itemName) => {
        const catName = (productCategoryMap[productId] || "").toLowerCase();
        const name = (itemName || "").toLowerCase();
        return (
          catName.includes('bebida') || 
          catName.includes('taper') || 
          catName.includes('envase') || 
          name.includes('taper') || 
          name.includes('táper') || 
          name.includes('envase')
        );
      };

      const allItemsAreInstant = orderData.items.every(item => {
        return isInstantItem(item.id, item.name);
      });

      const initialOrderStatus = allItemsAreInstant ? 'LISTO' : 'PENDIENTE';

      // 1. Guardar en Base de Datos (con transacción para descontar stock)
      const savedOrder = await prisma.$transaction(async (tx) => {
        // Descontar stock
        for (const item of orderData.items) {
          const dbProduct = dbProducts.find(p => p.id === item.id);
          if (dbProduct && dbProduct.stock !== -1) {
            await tx.product.update({
              where: { id: item.id },
              data: { stock: { decrement: item.quantity } }
            });
          }
        }

        return await tx.order.create({
          data: {
            tableId: orderData.tableId,
            waiterId: orderData.waiterId,
            waiterName: orderData.waiterName || "Mozo",
            floor: parseInt(orderData.floor) || 1,
            status: initialOrderStatus,
            total: orderData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
            toGo: orderData.toGo || false,
            orderItems: {
              create: orderData.items.map(item => {
                const isInstant = isInstantItem(item.id, item.name);
                return {
                  productId: item.id,
                  quantity: item.quantity,
                  notes: item.notes || "",
                  status: isInstant ? 'LISTO' : 'PENDIENTE'
                };
              })
            }
          },
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
          }
        });
      });

      // Si se descontó stock, notificar a todos para actualizar el menú en el frontend
      const productsWithStock = dbProducts.filter(p => p.stock !== -1);
      if (productsWithStock.length > 0) {
        const updatedMenu = await prisma.category.findMany({ include: { products: true } });
        io.emit('menu_updated', updatedMenu);
      }

      // Actualizar estado de la mesa a OCUPADA (solo si no es para llevar)
      if (!orderData.toGo) {
        await prisma.table.update({
          where: { id: orderData.tableId },
          data: { status: 'OCUPADA' }
        });
        // Notificar cambio de estado de mesa
        io.emit('table_status_updated', { tableId: orderData.tableId, status: 'OCUPADA' });
      }

      // 2. Formatear para el frontend (manteniendo compatibilidad con lo que ya tiene)
      const orderToProcess = {
        id: savedOrder.id,
        tableId: savedOrder.tableId,
        tableNumber: savedOrder.table.number,
        floor: savedOrder.floor,
        waiterId: savedOrder.waiterId,
        waiterName: savedOrder.waiterName || savedOrder.waiter.name,
        createdAt: savedOrder.createdAt,
        updatedAt: savedOrder.updatedAt,
        status: savedOrder.status,
        total: savedOrder.total,
        notes: orderData.notes,
        toGo: savedOrder.toGo,
        items: savedOrder.orderItems.map(oi => ({
          id: oi.id,
          productId: oi.productId,
          name: oi.product.name,
          size: oi.product.size,
          price: oi.product.price,
          quantity: oi.quantity,
          notes: oi.notes,
          status: oi.status,
          categoryName: oi.product.category.name
        }))
      };

      // A) Emitir a todos (cocina, mozos y admin) para sincronización en tiempo real
      io.emit('kitchen_new_order', orderToProcess);

      // B) Imprimir Ticket (Asíncrono)
      printOrderTicket(orderToProcess);

      // Confirmar al mozo
      socket.emit('order_ack', { success: true, message: 'Pedido enviado a cocina' });
    } catch (error) {
      console.error('[Socket] Error al procesar pedido:', error);
      socket.emit('order_ack', { success: false, message: 'Error al enviar pedido' });
    }
  });

  // Cuando cocina marca un plato individual como listo
  socket.on('mark_item_ready', async ({ orderId, itemId, waiterId, tableNumber }) => {
    try {
      console.log(`[Socket] Plato ${itemId} de pedido ${orderId} listo para mesa ${tableNumber}`);

      // 1. Actualizar el OrderItem a LISTO en la base de datos
      const updatedItem = await prisma.orderItem.update({
        where: { id: itemId },
        data: { status: 'LISTO' },
        include: { product: true, order: true }
      });

      // 2. Verificar si todos los ítems de este pedido ya están listos
      const allItems = await prisma.orderItem.findMany({
        where: { orderId }
      });

      const allReady = allItems.every(item => item.status === 'LISTO');
      let orderStatus = 'PENDIENTE';

      let updatedOrder = null;
      if (allReady) {
        orderStatus = 'LISTO';
        // Actualizar la orden principal
        updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'LISTO' }
        });
      }

      // Calcular tiempo transcurrido desde la creación
      const startTime = new Date(updatedItem.order.createdAt).getTime();
      const now = new Date().getTime();
      const timeTaken = Math.floor((now - startTime) / 1000);

      // Notificación específica para el mozo
      io.to(`room_waiter_${waiterId}`).emit('notify_waiter_ready', {
        id: Date.now() + Math.random(),
        type: 'ITEM_READY',
        orderId,
        itemId,
        tableNumber,
        floor: updatedItem.order.floor,
        itemName: updatedItem.product.name,
        timeTaken,
        message: `¡${updatedItem.product.name} Listo! Mesa ${tableNumber} - Piso ${updatedItem.order.floor}`
      });

      // Sincronizar estado del plato y del pedido a todos los clientes conectados
      io.emit('order_item_status_updated', {
        orderId,
        itemId,
        itemStatus: 'LISTO',
        orderStatus,
        updatedAt: updatedOrder?.updatedAt || updatedItem.updatedAt
      });
    } catch (error) {
      console.error('[Socket] Error al marcar plato como listo:', error);
    }
  });

  // Cuando cocina marca como listo completo (Despachar)
  socket.on('mark_order_ready', async ({ orderId, waiterId, tableNumber }) => {
    try {
      console.log(`[Socket] Pedido ${orderId} completo listo para mesa ${tableNumber}`);
      
      // Actualizar estado en DB de la orden y todos sus items
      const [updatedOrder, ] = await prisma.$transaction([
        prisma.order.update({
          where: { id: orderId },
          data: { status: 'LISTO' }
        }),
        prisma.orderItem.updateMany({
          where: { orderId },
          data: { status: 'LISTO' }
        })
      ]);

      // Calcular tiempo transcurrido
      const startTime = new Date(updatedOrder.createdAt).getTime();
      const now = new Date().getTime();
      const timeTaken = Math.floor((now - startTime) / 1000);

      // Notificar cambio a todos (para sincronizar activeOrders en otros clientes)
      io.emit('order_status_updated', { orderId, status: 'LISTO', updatedAt: updatedOrder.updatedAt });

      // Notificación específica para el mozo
      io.to(`room_waiter_${waiterId}`).emit('notify_waiter_ready', {
        id: Date.now() + Math.random(),
        type: 'ORDER_READY',
        orderId,
        tableNumber,
        floor: updatedOrder.floor,
        timeTaken,
        message: `¡Pedido Despachado! Mesa ${tableNumber} - Piso ${updatedOrder.floor}`
      });
    } catch (error) {
      console.error('[Socket] Error al marcar pedido como listo:', error);
    }
  });

  // Cuando cocina revierte un pedido listo a pendiente (historial de cocina)
  socket.on('unready_order', async ({ orderId }) => {
    try {
      console.log(`[Socket] Reabriendo pedido ${orderId} en cocina`);

      const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
        include: {
          product: {
            include: { category: true }
          }
        }
      });

      const isFoodItem = (oi) => {
        const cat = (oi.product.category.name || "").toLowerCase();
        const name = (oi.product.name || "").toLowerCase();
        return (
          !cat.includes('bebida') && 
          !cat.includes('taper') && 
          !cat.includes('envase') && 
          !name.includes('taper') && 
          !name.includes('táper') && 
          !name.includes('envase')
        );
      };

      const foodItemIds = orderItems.filter(isFoodItem).map(oi => oi.id);

      await prisma.$transaction([
        prisma.order.update({
          where: { id: orderId },
          data: { status: 'PENDIENTE' }
        }),
        prisma.orderItem.updateMany({
          where: { id: { in: foodItemIds } },
          data: { status: 'PENDIENTE' }
        })
      ]);

      io.emit('order_status_updated', { orderId, status: 'PENDIENTE' });
      
      foodItemIds.forEach(itemId => {
        io.emit('order_item_status_updated', {
          orderId,
          itemId,
          itemStatus: 'PENDIENTE',
          orderStatus: 'PENDIENTE'
        });
      });
    } catch (error) {
      console.error('[Socket] Error al reabrir pedido:', error);
    }
  });

  // Cuando cocina revierte un plato individual a pendiente
  socket.on('unready_item', async ({ orderId, itemId }) => {
    try {
      console.log(`[Socket] Revirtiendo plato ${itemId} de pedido ${orderId} a pendiente`);

      await prisma.$transaction([
        prisma.orderItem.update({
          where: { id: itemId },
          data: { status: 'PENDIENTE' }
        }),
        prisma.order.update({
          where: { id: orderId },
          data: { status: 'PENDIENTE' }
        })
      ]);

      io.emit('order_item_status_updated', {
        orderId,
        itemId,
        itemStatus: 'PENDIENTE',
        orderStatus: 'PENDIENTE'
      });
    } catch (error) {
      console.error('[Socket] Error al revertir plato:', error);
    }
  });
};
