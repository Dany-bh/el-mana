#!/bin/bash
# Script de despliegue y compilación final en el VPS
set -e

echo "=== 1. Configurando Backend (npm install, Prisma) ==="
cd /home/ubuntu/EL-MANA/backend
npm install

echo "=== Ejecutando migraciones de base de datos con Prisma ==="
npx prisma db push
npx prisma generate

echo "=== Ejecutando Prisma Seed (Carga inicial de datos) ==="
npx prisma db seed || echo "Seed no disponible o fallido, continuando..."

echo "=== Iniciando Backend Express con PM2 (24/7) ==="
pm2 delete el-mana-backend || true
pm2 start npm --name "el-mana-backend" -- start
pm2 save
pm2 startup || echo "Configura PM2 startup manualmente si es necesario"

echo "=== 2. Configurando Frontend (npm install, Vite build) ==="
cd /home/ubuntu/EL-MANA/frontend
npm install

echo "=== Compilando el Frontend con Vite ==="
npm run build

echo "=== 3. Configurando permisos finales para Nginx ==="
chmod -R o+rX /home/ubuntu/EL-MANA/frontend/dist

echo "=== ¡PROCESO DE DESPLIEGUE FINALIZADO CON ÉXITO! ==="
