# Nova Player - Database Schema

## Vue d'ensemble

Ce dossier contient le schéma PostgreSQL vanilla pour Nova Player Core.
**Aucune dépendance Supabase** - 100% PostgreSQL standard.

## Fichiers

| Fichier | Description |
|---------|-------------|
| `nova_player_schema.sql` | Schéma complet PostgreSQL 15+ |
| `schema.sql` | Ancien fichier de référence (legacy) |

## Installation

### Prérequis

- PostgreSQL 15+
- Extension `uuid-ossp` (incluse dans le script)

### Commandes

```bash
# 1. Créer la base de données
createdb nova_player

# 2. Importer le schéma
psql -d nova_player < database/nova_player_schema.sql

# 3. Vérifier l'import
psql -d nova_player -c "\dt"
psql -d nova_player -c "SELECT * FROM get_device_stats();"
```

### Avec Docker

```bash
# Utiliser le docker-compose du backend
cd backend
docker-compose up -d postgres

# Importer le schéma
docker exec -i nova_postgres psql -U nova -d nova_player < ../database/nova_player_schema.sql
```

## Schéma des tables

### Diagramme ER

```
┌─────────────────┐
│   admin_users   │
├─────────────────┤
│ id (PK)         │
│ email           │
│ password_hash   │
│ name            │
│ role            │
│ is_active       │
│ last_login      │
│ created_at      │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────────┐
│   admin_logs    │       │  device_action_logs │
├─────────────────┤       ├─────────────────────┤
│ id (PK)         │       │ id (PK)             │
│ admin_id (FK)   │       │ device_id (FK)      │
│ action          │       │ admin_id (FK)       │
│ target_device_id│       │ action              │
│ details (JSONB) │       │ details (JSONB)     │
│ created_at      │       │ created_at          │
└─────────────────┘       └──────────┬──────────┘
                                     │
                                     │ N:1
                                     ▼
┌─────────────────┐       ┌─────────────────────┐
│   device_logs   │◄──────│      devices        │
├─────────────────┤  N:1  ├─────────────────────┤
│ id (PK)         │       │ id (PK)             │
│ device_id (FK)  │       │ device_id (UNIQUE)  │
│ uid             │       │ uid (UNIQUE)        │
│ action          │       │ pin_hash            │
│ previous_status │       │ platform            │
│ new_status      │       │ status              │
│ actor_type      │       │ trial_start         │
│ created_at      │       │ trial_end           │
└─────────────────┘       │ days_left           │
                          │ created_at          │
                          └──────────┬──────────┘
                                     │
                                     │ referenced by
                                     ▼
                          ┌─────────────────────┐
                          │     api_logs        │
                          ├─────────────────────┤
                          │ id (PK)             │
                          │ endpoint            │
                          │ method              │
                          │ device_id           │
                          │ response_status     │
                          │ response_time_ms    │
                          │ created_at          │
                          └─────────────────────┘
```

## Tables

### `admin_users`

Comptes administrateurs du panel.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Clé primaire |
| `email` | TEXT | Email unique |
| `password_hash` | TEXT | Hash bcrypt |
| `name` | TEXT | Nom affiché |
| `role` | admin_role | `super_admin`, `admin`, `moderator` |
| `is_active` | BOOLEAN | Compte actif |
| `last_login` | TIMESTAMPTZ | Dernière connexion |

### `devices`

Table principale des devices enregistrés.

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Clé primaire |
| `device_id` | TEXT | ID unique du device (hardware) |
| `uid` | TEXT | Identifiant public `NVP-XXXXXX` |
| `pin_hash` | TEXT | Hash bcrypt du PIN |
| `platform` | device_platform | `android`, `ios`, `windows`, `mac` |
| `status` | device_status | `trial`, `active`, `expired`, `banned` |
| `trial_start` | TIMESTAMPTZ | Début du trial |
| `trial_end` | TIMESTAMPTZ | Fin du trial |
| `days_left` | INTEGER | Jours restants |
| `manual_override` | BOOLEAN | Ignore le calcul auto |

### `device_logs`

Historique des événements lifecycle.

| Colonne | Type | Description |
|---------|------|-------------|
| `device_id` | TEXT | FK vers devices |
| `action` | device_log_action | Type d'événement |
| `previous_status` | device_status | Ancien statut |
| `new_status` | device_status | Nouveau statut |
| `actor_type` | actor_type | `system`, `admin`, `user` |

### `admin_logs`

Audit trail des actions admin.

| Colonne | Type | Description |
|---------|------|-------------|
| `admin_id` | UUID | FK vers admin_users |
| `action` | admin_log_action | Type d'action |
| `target_device_id` | TEXT | Device ciblé |
| `details` | JSONB | Détails JSON |

### `api_logs`

Monitoring des appels API.

| Colonne | Type | Description |
|---------|------|-------------|
| `endpoint` | TEXT | Route appelée |
| `method` | TEXT | HTTP method |
| `response_status` | INTEGER | Code HTTP |
| `response_time_ms` | INTEGER | Temps de réponse |

## Enums

### `device_status`
- `trial` - Période d'essai
- `active` - Licence active
- `expired` - Expiré
- `banned` - Banni

### `device_platform`
- `android`, `ios`, `windows`, `mac`

### `admin_role`
- `super_admin` - Accès complet
- `admin` - Gestion des devices
- `moderator` - Lecture seule + notes

### `action_type`
- `register`, `status_check`, `activate`, `ban`, `unban`
- `extend_trial`, `reset_trial`, `set_expiry`, `add_note`
- `batch_action`, `regenerate_pin`

## Fonctions

### `get_device_stats()`

Retourne les statistiques globales.

```sql
SELECT * FROM get_device_stats();
```

Résultat :
```
total_devices | trial_devices | active_devices | expired_devices | banned_devices | devices_today | devices_this_week
--------------+---------------+----------------+-----------------+----------------+---------------+------------------
          150 |            45 |             80 |              20 |              5 |            12 |                38
```

### `purge_old_logs()`

Supprime les logs de plus de 90 jours.

```sql
SELECT * FROM purge_old_logs();
```

## Synchronisation Prisma

Après import du schéma :

```bash
cd backend

# Pull le schéma depuis la DB
npx prisma db pull

# Générer le client
npx prisma generate
```

## Migrations

Pour les changements futurs, utiliser Prisma migrations :

```bash
cd backend

# Créer une migration
npx prisma migrate dev --name add_new_field

# Appliquer en production
npx prisma migrate deploy
```

## Sécurité

- **Pas de RLS** : La sécurité est gérée au niveau API (middleware Express)
- **Mots de passe** : Toujours hashés avec bcrypt (10+ rounds)
- **PINs** : Jamais stockés en clair, uniquement le hash
- **Logs** : Retention de 90 jours, purgés automatiquement
