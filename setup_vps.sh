#!/bin/bash
# Script de configuración automática para el VPS "El Maná"
set -e

echo "=== 1. Actualizando paquetes del sistema ==="
sudo apt-get update -y

echo "=== 2. Instalando Node.js v20 (NodeSource) ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== 3. Instalando dependencias básicas (Git, Nginx, PostgreSQL) ==="
sudo apt-get install -y git nginx postgresql postgresql-contrib build-essential

echo "=== 4. Configurando PostgreSQL ==="
# Iniciar y habilitar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Crear base de datos, usuario y contraseña
sudo -u postgres psql -c "CREATE USER el_mana_user WITH PASSWORD 'el_mana_secure_password_2026';" || true
sudo -u postgres psql -c "CREATE DATABASE el_mana_db OWNER el_mana_user;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE el_mana_db TO el_mana_user;" || true

echo "=== 5. Instalando PM2 globalmente ==="
sudo npm install -g pm2

echo "=== 6. Creando carpeta de la aplicación y configurando permisos ==="
mkdir -p /home/ubuntu/EL-MANA
chmod +x /home/ubuntu

echo "=== 7. Creando configuración de Nginx ==="
sudo tee /etc/nginx/sites-available/el-mana << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend React static build
    location / {
        root /home/ubuntu/EL-MANA/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend Express API Reverse Proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSockets (Socket.io) Reverse Proxy
    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Habilitar sitio en Nginx y deshabilitar el default
sudo ln -sf /etc/nginx/sites-available/el-mana /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Reiniciar Nginx
sudo systemctl restart nginx

echo "=== Configuración básica del VPS completada con éxito ==="
