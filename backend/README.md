# Nova Player Backend

Backend API pour Nova Player - Alternative de déploiement VPS.

## 🚀 Quick Start

### Développement local

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 3. Générer le client Prisma
npm run prisma:generate

# 4. Créer les tables (première fois)
npm run prisma:push

# 5. Lancer en développement
npm run dev
```

### Production (Docker)

```bash
# Lancer la stack complète
docker-compose up -d

# Voir les logs
docker-compose logs -f api
```

## 📡 Endpoints API

### POST /api/device/register

Enregistre un nouveau device ou retourne le statut d'un device existant.

**Request:**
```json
{
  "device_id": "unique-device-identifier",
  "platform": "android",
  "os_version": "14.0",
  "device_model": "Pixel 8",
  "architecture": "arm64",
  "player_version": "2.1.0",
  "app_build": 42
}
```

**Response (nouveau - 201):**
```json
{
  "status": "trial",
  "uid": "NVP-7F3A9C",
  "pin": "482917",
  "days_left": 7,
  "trial_end": "2026-02-10",
  "manual_override": false
}
```

**Response (existant - 200):**
```json
{
  "status": "trial",
  "uid": "NVP-7F3A9C",
  "days_left": 5,
  "trial_end": "2026-02-10",
  "manual_override": false
}
```

### POST /api/device/status

Vérifie le statut d'un device.

**Request:**
```json
{
  "device_id": "unique-device-identifier"
}
```

**Response:**
```json
{
  "status": "trial",
  "days_left": 5,
  "trial_end": "2026-02-10",
  "manual_override": false
}
```

## 🔐 Sécurité

- **UID**: Format `NVP-XXXXXX`, public, unique, immuable
- **PIN**: 6 chiffres, hashé (bcrypt), retourné une seule fois à la création
- **Rate Limiting**: 100 requêtes / 15 minutes par IP
- **CORS**: Origins restreints
- **Helmet**: Headers de sécurité HTTP

## 📁 Structure

```
backend/
├── src/
│   ├── server.ts           # Point d'entrée
│   ├── app.ts              # Configuration Express
│   ├── config/             # Configuration (env, database)
│   ├── routes/             # Définition des routes
│   ├── controllers/        # Handlers HTTP
│   ├── services/           # Logique métier
│   ├── middlewares/        # Middlewares Express
│   └── utils/              # Utilitaires (hash, response)
├── prisma/
│   └── schema.prisma       # Schéma base de données
├── package.json
├── tsconfig.json
├── Dockerfile
└── docker-compose.yml
```

## 🗄️ Base de données

Le backend utilise sa propre base PostgreSQL, indépendante de Supabase.

```bash
# Voir le studio Prisma
npm run prisma:studio

# Créer une migration
npm run prisma:migrate
```

## 🌐 Déploiement VPS

1. Cloner le repo sur le VPS
2. Configurer `.env` avec les bonnes valeurs
3. Lancer avec Docker Compose
4. Configurer Nginx en reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name core.nova-player.fr;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 Logs

Les logs sont stockés en base de données:
- `device_logs`: Actions sur les devices
- `api_logs`: Performance et monitoring API
