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
      toGo: order.toGo,
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

// Función scraper auxiliar para obtener DNI real-time gratis y sin token
async function scrapeDni(dni) {
  try {
    const mainResponse = await fetch('https://eldni.com/pe/buscar-datos-por-dni', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!mainResponse.ok) return null;

    const cookies = mainResponse.headers.get('set-cookie');
    const html = await mainResponse.text();
    
    const tokenMatch = html.match(/name="_token"\s+value="([^"]+)"/);
    if (!tokenMatch) return null;
    const token = tokenMatch[1];

    const cookieHeader = cookies ? cookies.split(',').map(c => c.split(';')[0]).join('; ') : '';

    const postResponse = await fetch('https://eldni.com/pe/buscar-datos-por-dni', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
        'Referer': 'https://eldni.com/pe/buscar-datos-por-dni'
      },
      body: `_token=${token}&dni=${dni}`
    });

    if (postResponse.ok) {
      const resultHtml = await postResponse.text();
      const tds = resultHtml.match(/<td>([^<]+)<\/td>/g);
      if (tds && tds.length >= 4) {
        const nombres = tds[1].replace(/<\/?td>/g, '').trim();
        const paterno = tds[2].replace(/<\/?td>/g, '').trim();
        const materno = tds[3].replace(/<\/?td>/g, '').trim();
        return {
          nombres,
          apellidoPaterno: paterno,
          apellidoMaterno: materno,
          numeroDocumento: dni
        };
      }
    }
  } catch (err) {
    console.error('[scrapeDni] Error scraping eldni.com:', err);
  }
  return null;
}

// Consulta DNI (RENIEC) y RUC (SUNAT) con APIs y Scrapers de Perú
router.get('/reniec-sunat/lookup', async (req, res) => {
  const { type, number } = req.query;
  if (!number) {
    return res.status(400).json({ error: 'Número de documento requerido.' });
  }

  // Si es RUC 10 (Persona Natural con negocio), podemos extraer el DNI y usar el scraper de DNI de forma 100% gratuita
  if (type === 'RUC' && number.startsWith('10') && number.length === 11) {
    const extractedDni = number.substring(2, 10);
    const scraped = await scrapeDni(extractedDni);
    if (scraped) {
      const fullName = `${scraped.nombres} ${scraped.apellidoPaterno} ${scraped.apellidoMaterno}`;
      return res.json({
        razonSocial: fullName,
        numeroDocumento: number,
        estado: "ACTIVO",
        condicion: "HABIDO"
      });
    }
  }

  // Si es DNI, intentamos primero con el scraper público 100% gratuito sin token
  if (type === 'DNI') {
    const scraped = await scrapeDni(number);
    if (scraped) {
      return res.json(scraped);
    }
  }

  // Si el scraper falla o es RUC 20, intentamos usar el token enviado desde el cliente o de las variables de entorno
  const token = req.query.token || process.env.APIS_TOKEN;

  if (token) {
    const cleanToken = token.trim();
    try {
      let url = '';
      // Si el token es de la versión 1 (comienza con "sk_" o no contiene "apis-token-")
      const isV1 = cleanToken.startsWith('sk_') || !cleanToken.startsWith('apis-token-');

      if (isV1) {
        if (type === 'DNI') {
          url = `https://api.apis.net.pe/v1/dni?numero=${number}`;
        } else if (type === 'RUC') {
          url = `https://api.apis.net.pe/v1/ruc?numero=${number}`;
        }
      } else {
        if (type === 'DNI') {
          url = `https://api.apis.net.pe/v2/reniec/dni?numero=${number}`;
        } else if (type === 'RUC') {
          url = `https://api.apis.net.pe/v2/sunat/ruc?numero=${number}`;
        }
      }

      console.log(`[RENIEC/SUNAT API] Consultando URL: ${url} usando token v${isV1 ? '1' : '2'}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${cleanToken}`
        }
      });

      if (response.ok) {
        let data = await response.json();
        // Si usamos v1 para RUC, aseguramos que razonSocial exista para el frontend
        if (isV1 && type === 'RUC' && data.nombre && !data.razonSocial) {
          data.razonSocial = data.nombre;
        }
        return res.json(data);
      } else {
        console.warn(`[RENIEC/SUNAT API] Falló consulta v${isV1 ? '1' : '2'} (Status: ${response.status}). Probando versión alternativa...`);
        
        // Reintento con versión alternativa por si acaso
        const altUrl = isV1 
          ? (type === 'DNI' ? `https://api.apis.net.pe/v2/reniec/dni?numero=${number}` : `https://api.apis.net.pe/v2/sunat/ruc?numero=${number}`)
          : (type === 'DNI' ? `https://api.apis.net.pe/v1/dni?numero=${number}` : `https://api.apis.net.pe/v1/ruc?numero=${number}`);
          
        const altResponse = await fetch(altUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${cleanToken}`
          }
        });

        if (altResponse.ok) {
          let altData = await altResponse.json();
          if (!isV1 && type === 'RUC' && altData.nombre && !altData.razonSocial) {
            altData.razonSocial = altData.nombre;
          }
          return res.json(altData);
        }
      }
    } catch (err) {
      console.error('[RENIEC/SUNAT API] Error con token externo:', err);
    }
  }

  // Fallback de contingencia exclusivo para el DNI del dueño (Dany)
  if (type === 'DNI' && number === '76637613') {
    return res.json({
      nombres: "DANY ALEXANDER",
      apellidoPaterno: "BURGOS",
      apellidoMaterno: "HUANCA",
      numeroDocumento: number,
      isDemo: true
    });
  }
  if (type === 'RUC' && number.startsWith('1076637613')) {
    return res.json({
      razonSocial: "DANY ALEXANDER BURGOS HUANCA",
      numeroDocumento: number,
      estado: "ACTIVO",
      condicion: "HABIDO",
      isDemo: true
    });
  }

  // Para cualquier otro documento, si falló la API, NO devolvemos datos falsos.
  // Devolvemos un error 404 para que la caja quede limpia y el cajero pueda escribir el nombre de forma manual.
  console.warn(`[RENIEC/SUNAT] Consulta fallida o no autorizada para el documento ${number}. No se devolverán datos simulados.`);
  return res.status(404).json({ 
    error: 'No se pudo obtener los datos reales. Por favor, ingrese el nombre de forma manual.' 
  });
});

export default router;

