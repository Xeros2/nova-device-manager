# Nova Player Core

> **Backend API + Admin Panel pour Nova Player**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-3ECF8E)](https://supabase.com)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://typescriptlang.org)

---

## 🎯 Description

Nova Player Core est le cœur backend et le panel d'administration pour l'application Nova Player. Il gère :

- **Enregistrement des devices** avec système UID + PIN sécurisé
- **Gestion des licences** (trial, active, expired, banned)
- **Panel admin** pour gérer les devices et les utilisateurs
- **API stable** pour les applications Flutter (Android, iOS, Windows, Mac)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FLUTTER APPS                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │ Android │  │   iOS   │  │ Windows │  │   Mac   │         │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
│       └────────────┴────────────┴────────────┘               │
│                           │                                  │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              SUPABASE EDGE FUNCTIONS                   │  │
│  │  • device-register    • device-status                  │  │
│  │  • admin-regenerate-pin                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   POSTGRESQL DB                        │  │
│  │  • devices  • device_action_logs  • admin_roles       │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ▲                                  │
│                           │                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              ADMIN PANEL (React + Vite)                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du projet

```
nova-player-core/
│
├── supabase/
│   ├── functions/              # API Backend (Edge Functions)
│   │   ├── device-register/    # Enregistrement device + UID/PIN
│   │   ├── device-status/      # Vérification status
│   │   └── admin-regenerate-pin/ # Régénération PIN (admin)
│   ├── migrations/             # Migrations SQL
│   └── config.toml             # Configuration Supabase
│
├── src/                        # Frontend Admin (React)
│   ├── components/             # Composants React
│   ├── hooks/                  # Custom hooks
│   ├── pages/                  # Pages (Login, Dashboard, Devices...)
│   └── types/                  # Types TypeScript
│
├── database/
│   └── schema.sql              # Schéma DB consolidé
│
├── docs/                       # Documentation
│   ├── API_CONTRACT.md         # Contrat API Flutter
│   ├── DEVICE_FLOW.md          # Flux device
│   ├── UID_PIN_RULES.md        # Règles UID/PIN
│   ├── ARCHITECTURE.md         # Architecture technique
│   └── ADMIN_GUIDE.md          # Guide admin panel
│
├── .env.example                # Template variables environnement
└── README.md                   # Ce fichier
```

---

## 🚀 Quick Start

### Prérequis

- Node.js 18+
- npm ou bun

### Installation

```bash
# Cloner le repository
git clone <YOUR_GIT_URL>
cd nova-player-core

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les variables (voir .env.example)

# Lancer le serveur de développement
npm run dev
```

### Accès

- **Admin Panel** : http://localhost:5173
- **API Base URL** : https://kcverunpdrbiiyeqekzw.supabase.co/functions/v1

---

## 📡 API Endpoints

### Public (Flutter)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/device-register` | Enregistrer un device |
| POST | `/device-status` | Vérifier le status |

### Admin

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/admin-regenerate-pin` | Régénérer le PIN |

📚 **Documentation complète** : [docs/API_CONTRACT.md](docs/API_CONTRACT.md)

---

## 🔐 Système UID + PIN

Chaque device reçoit :

- **UID** : Identifiant public `NVP-XXXXXX`
- **PIN** : Code secret à 6 chiffres (affiché une seule fois)

📚 **Règles détaillées** : [docs/UID_PIN_RULES.md](docs/UID_PIN_RULES.md)

---

## 🛠️ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Backend API | Supabase Edge Functions (Deno) |
| Base de données | PostgreSQL |
| Frontend Admin | React 18 + Vite + TypeScript |
| UI Framework | Tailwind CSS + shadcn/ui |
| State Management | TanStack Query |
| Auth | Supabase Auth |

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [API_CONTRACT.md](docs/API_CONTRACT.md) | Contrat API pour Flutter |
| [DEVICE_FLOW.md](docs/DEVICE_FLOW.md) | Cycle de vie des devices |
| [UID_PIN_RULES.md](docs/UID_PIN_RULES.md) | Règles de sécurité UID/PIN |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique |
| [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Guide d'utilisation admin |

---

## 🔒 Sécurité

- ✅ RLS (Row Level Security) sur toutes les tables
- ✅ PIN hashé avec bcrypt
- ✅ JWT pour l'authentification admin
- ✅ Logs d'audit complets

---

## 📱 Intégration Flutter

```dart
// Exemple d'enregistrement
final response = await http.post(
  Uri.parse('$baseUrl/device-register'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'device_id': deviceId,
    'platform': 'android',
    'os_version': '14',
    'device_model': 'Pixel 8',
    'architecture': 'arm64',
    'player_version': '1.0.0',
    'app_build': 1,
  }),
);

// Réponse (nouveau device)
// {
//   "status": "trial",
//   "uid": "NVP-7F3A9C",
//   "pin": "482917",  <- Affiché UNE SEULE FOIS
//   "days_left": 7,
//   "trial_end": "2026-01-28"
// }
```

---

## 📄 License

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Contributeurs

- Nova Player Team

---

## 📞 Support

Pour toute question, consultez la documentation ou ouvrez une issue.
