import { ThermalPrinter, PrinterTypes, CharacterSet } from 'node-thermal-printer';

export const printOrderTicket = async (order) => {
  const printerName = process.env.PRINTER_NAME || 'lp0';
  console.log(`[Printer] Generando ticket para Mesa ${order.tableNumber} en ${printerName}...`);
  
  try {
    let printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `printer:${printerName}`,
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      lineCharacter: "=",
      width: 42
    });

    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
    printer.println("EL MANÁ");
    printer.println("Y SU SAZÓN");
    printer.setTextNormal();
    printer.newLine();
    
    printer.alignLeft();
    printer.println(`MESA: ${order.tableNumber} - PISO: ${order.floor || 1}`);
    printer.println(`MOZO: ${order.waiterName}`);
    printer.println(`FECHA: ${new Date().toLocaleString()}`);
    printer.drawLine();
    
    order.items.forEach(item => {
      let detail = `${item.quantity} x ${item.name}`;
      if (item.size) detail += ` [${item.size}]`;
      printer.println(detail);
      if (item.notes) printer.println(`   - NOTA: ${item.notes}`);
    });
    
    if (order.notes) {
      printer.newLine();
      printer.println(`NOTA GENERAL: ${order.notes}`);
    }
    
    printer.drawLine();
    printer.alignCenter();
    printer.println("PEDIDO PARA COCINA");
    printer.cut();

    // let execute = await printer.execute();
    console.log("[Printer] Ticket generado exitosamente (Simulado)");
  } catch (error) {
    console.log("\n==========================================");
    console.log("            EL MANÁ Y SU SAZÓN            ");
    console.log("==========================================");
    console.log(`MESA: ${order.tableNumber} - PISO: ${order.floor || 1}`);
    console.log(`MOZO: ${order.waiterName}`);
    console.log(`FECHA: ${new Date().toLocaleString()}`);
    console.log("------------------------------------------");
    order.items.forEach(item => {
      let detail = `${item.quantity} x ${item.name}`;
      if (item.size) detail += ` [${item.size}]`;
      console.log(detail);
      if (item.notes) console.log(`   - NOTA: ${item.notes}`);
    });
    if (order.notes) {
      console.log("------------------------------------------");
      console.log(`NOTA GENERAL: ${order.notes}`);
    }
    console.log("==========================================");
    console.log("[Printer] Comanda impresa en consola (Modo Simulación Activo)\n");
  }
};

export const printBillTicket = async (tableNumber, waiterName, items, total, type = 'BOLETA', docNumber = '', customerName = '', floor = 1) => {
  const printerName = process.env.PRINTER_NAME || 'POS-80';
  console.log(`[Printer] Generando ${type} para Mesa ${tableNumber} en la impresora ${printerName}...`);
  
  try {
    let printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `printer:${printerName}`,
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      lineCharacter: "=",
      width: 42
    });

    printer.alignCenter();
    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
    printer.println("EL MANÁ");
    printer.println("Y SU SAZÓN");
    printer.setTextNormal();
    printer.println("De: Jorge Burgos");
    printer.println("R.U.C. 10452389512");
    printer.println("Av. Principal 123 - Chiclayo");
    printer.newLine();
    
    printer.setTextDoubleHeight();
    printer.println(type === 'FACTURA' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA');
    printer.setTextNormal();
    printer.drawLine();
    
    printer.alignLeft();
    printer.println(`MESA: ${tableNumber} - PISO: ${floor}`);
    printer.println(`MOZO: ${waiterName}`);
    printer.println(`FECHA: ${new Date().toLocaleString()}`);
    if (docNumber) {
      printer.println(`${type === 'FACTURA' ? 'R.U.C.' : 'D.N.I.'}: ${docNumber}`);
    }
    if (customerName) {
      printer.println(`CLIENTE: ${customerName.toUpperCase()}`);
    }
    printer.drawLine();
    
    // Header de productos
    printer.println("CANT PRODUCTO         PRECIO    SUBTOTAL");
    printer.drawLine();

    items.forEach(item => {
      let nameStr = item.name;
      if (item.size) nameStr += ` (${item.size})`;
      nameStr = nameStr.substring(0, 18).padEnd(18, ' ');
      
      const qtyStr = item.quantity.toString().padStart(3, ' ');
      const priceStr = item.price.toFixed(2).padStart(8, ' ');
      const subtotalStr = (item.price * item.quantity).toFixed(2).padStart(10, ' ');
      
      printer.println(`${qtyStr} ${nameStr}${priceStr}${subtotalStr}`);
    });
    
    printer.drawLine();
    printer.alignRight();
    printer.setTextDoubleHeight();
    printer.println(`TOTAL A PAGAR: S/.${total.toFixed(2)}`);
    printer.setTextNormal();
    
    printer.newLine();
    printer.alignCenter();
    printer.println("¡Gracias por su preferencia!");
    printer.println("Vuelva pronto");
    printer.cut();

    await printer.execute();
    console.log(`[Printer] ${type} impresa de forma exitosa.`);
  } catch (error) {
    console.log("\n==========================================");
    console.log("            EL MANÁ Y SU SAZÓN            ");
    console.log("==========================================");
    console.log(`           ${type === 'FACTURA' ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA'}          `);
    console.log("==========================================");
    console.log(`MESA: ${tableNumber} - PISO: ${floor}`);
    console.log(`MOZO: ${waiterName}`);
    console.log(`FECHA: ${new Date().toLocaleString()}`);
    if (docNumber) {
      console.log(`${type === 'FACTURA' ? 'R.U.C.' : 'D.N.I.'}: ${docNumber}`);
    }
    if (customerName) {
      console.log(`CLIENTE: ${customerName.toUpperCase()}`);
    }
    console.log("------------------------------------------");
    console.log("CANT PRODUCTO         PRECIO    SUBTOTAL");
    console.log("------------------------------------------");
    items.forEach(item => {
      let nameStr = item.name;
      if (item.size) nameStr += ` (${item.size})`;
      nameStr = nameStr.substring(0, 18).padEnd(18, ' ');
      const qtyStr = item.quantity.toString().padStart(3, ' ');
      const priceStr = item.price.toFixed(2).padStart(8, ' ');
      const subtotalStr = (item.price * item.quantity).toFixed(2).padStart(10, ' ');
      console.log(`${qtyStr} ${nameStr}${priceStr}${subtotalStr}`);
    });
    console.log("------------------------------------------");
    console.log(`TOTAL A PAGAR: S/.${total.toFixed(2)}`);
    console.log("==========================================");
    console.log("        ¡Gracias por su preferencia!      ");
    console.log("==========================================");
    console.log(`[Printer] ${type} impresa en consola (Fallback POS) en ${printerName}\n`);
  }
};
