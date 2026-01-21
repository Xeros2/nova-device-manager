# Nova Player - Device Flow

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-21

Ce document décrit le cycle de vie complet d'un device Nova Player.

---

## Vue d'ensemble

```mermaid
stateDiagram-v2
    [*] --> Unregistered
    Unregistered --> Trial: POST /device-register
    Trial --> Active: Admin activation
    Trial --> Expired: days_left == 0
    Active --> Expired: Licence expired
    Expired --> Active: Admin renewal
    Trial --> Banned: Admin ban
    Active --> Banned: Admin ban
    Expired --> Banned: Admin ban
    Banned --> Trial: Admin unban + reset
    Banned --> Active: Admin unban + activate
```

---

## États du Device

| État | Description | Accès App |
|------|-------------|-----------|
| `trial` | Période d'essai (7 jours par défaut) | ✅ Complet |
| `active` | Licence active | ✅ Complet |
| `expired` | Trial ou licence expirée | ⚠️ Limité |
| `banned` | Banni par admin | ❌ Bloqué |

---

## Flux 1: Premier lancement (Registration)

```mermaid
sequenceDiagram
    participant App as Flutter App
    participant API as Backend API
    participant DB as Database

    Note over App: Premier lancement de l'app
    App->>App: Collecter infos device
    App->>API: POST /device-register
    Note over API: Nouveau device détecté
    API->>API: Générer UID (NVP-XXXXXX)
    API->>API: Générer PIN (6 chiffres)
    API->>API: Hasher PIN (bcrypt)
    API->>API: Calculer trial_end (+7 jours)
    API->>DB: INSERT device
    API->>DB: INSERT action_log (register)
    API-->>App: 201 Created
    Note over App: Réponse: {status, uid, pin, trial_end}
    App->>App: Sauvegarder device_id localement
    App->>App: Afficher UID + PIN à l'utilisateur
    Note over App: ⚠️ PIN visible UNE SEULE FOIS
```

### Request

```json
{
  "device_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "platform": "android",
  "os_version": "14",
  "device_model": "Samsung Galaxy S24",
  "architecture": "arm64",
  "player_version": "1.0.0",
  "app_build": 1
}
```

### Response (201 Created)

```json
{
  "status": "trial",
  "uid": "NVP-7F3A9C",
  "pin": "482917",
  "days_left": 7,
  "trial_end": "2026-01-28",
  "manual_override": false
}
```

---

## Flux 2: Lancement suivant (Status Check)

```mermaid
sequenceDiagram
    participant App as Flutter App
    participant API as Backend API
    participant DB as Database

    Note over App: Lancement de l'app
    App->>App: Récupérer device_id local
    App->>API: POST /device-status
    API->>DB: SELECT device WHERE device_id = ?
    alt Device trouvé
        API->>API: Calculer days_left
        API->>API: Vérifier expiration auto
        API->>DB: UPDATE last_seen, status, days_left
        API->>DB: INSERT action_log (status_check)
        API-->>App: 200 OK {status, days_left, trial_end}
    else Device non trouvé
        API-->>App: 404 {error, status: "unknown"}
    end
    App->>App: Adapter UI selon status
```

### Request

```json
{
  "device_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ip_address": "192.168.1.100"
}
```

### Response (200 OK)

```json
{
  "status": "trial",
  "days_left": 5,
  "trial_end": "2026-01-28",
  "manual_override": false
}
```

---

## Flux 3: Expiration automatique

```mermaid
sequenceDiagram
    participant App as Flutter App
    participant API as Backend API
    participant DB as Database

    App->>API: POST /device-status
    API->>DB: SELECT device
    API->>API: Calculer days_left
    Note over API: days_left = 0
    Note over API: status = trial
    Note over API: manual_override = false
    API->>API: status → expired
    API->>DB: UPDATE status = 'expired'
    API-->>App: {status: "expired", days_left: 0}
    App->>App: Afficher écran "Trial expiré"
```

---

## Flux 4: Actions Admin

### 4.1 Activer un device

```mermaid
sequenceDiagram
    participant Admin as Admin Panel
    participant API as Supabase
    participant DB as Database

    Admin->>API: UPDATE device SET status = 'active'
    API->>DB: UPDATE devices
    API->>DB: INSERT action_log (activate)
    API-->>Admin: Success
```

### 4.2 Bannir un device

```mermaid
sequenceDiagram
    participant Admin as Admin Panel
    participant API as Supabase
    participant DB as Database

    Admin->>API: UPDATE device SET status = 'banned'
    API->>DB: UPDATE devices
    API->>DB: INSERT action_log (ban)
    API-->>Admin: Success
    Note over Admin: Device bloqué immédiatement
```

### 4.3 Étendre le trial

```mermaid
sequenceDiagram
    participant Admin as Admin Panel
    participant API as Supabase
    participant DB as Database

    Admin->>API: Extend trial (+7 days)
    API->>API: Calculer nouveau trial_end
    API->>DB: UPDATE trial_end, days_left, extended_count++
    API->>DB: INSERT action_log (extend_trial)
    API-->>Admin: Success
```

### 4.4 Régénérer PIN

```mermaid
sequenceDiagram
    participant Admin as Admin Panel
    participant API as Edge Function
    participant DB as Database

    Admin->>API: POST /admin-regenerate-pin
    API->>API: Vérifier JWT admin
    API->>API: Générer nouveau PIN
    API->>API: Hasher nouveau PIN
    API->>DB: UPDATE pin_hash, pin_created_at
    API->>DB: INSERT action_log (regenerate_pin)
    API-->>Admin: {new_pin: "738291"}
    Note over Admin: Afficher PIN UNE SEULE FOIS
```

---

## Comportement de l'app selon le status

| Status | Comportement app |
|--------|-----------------|
| `trial` | Fonctionnalités complètes + badge "Trial" |
| `active` | Fonctionnalités complètes |
| `expired` | Écran "Licence expirée" + options renouvellement |
| `banned` | Écran "Accès bloqué" + contact support |

---

## Gestion du manual_override

Le flag `manual_override` permet de **figer** le status d'un device.

| manual_override | Effet |
|-----------------|-------|
| `false` | Expiration automatique si days_left = 0 |
| `true` | Status **fixe**, aucune modification auto |

### Cas d'usage

- Admin veut garder un device en `active` indéfiniment
- Admin veut maintenir un `trial` au-delà de l'expiration
- Test ou support technique

---

## Timeline typique

```
Jour 0   │ Installation app → POST /device-register
         │ Réception UID + PIN
         │ Status: trial, days_left: 7
         │
Jour 1-6 │ Lancement app → POST /device-status
         │ Status: trial, days_left: 6→1
         │
Jour 7   │ Lancement app → POST /device-status
         │ days_left: 0 → Status: expired
         │
         │ [Option A] Admin: Extend trial
         │ Status: trial, days_left: 7
         │
         │ [Option B] Admin: Activate
         │ Status: active
         │
         │ [Option C] Aucune action
         │ Status reste: expired
```

---

## Données collectées

### À l'enregistrement

| Donnée | Source | Usage |
|--------|--------|-------|
| device_id | Flutter | Identification unique |
| platform | Flutter | Stats, filtres |
| os_version | Flutter | Compatibilité |
| device_model | Flutter | Support |
| architecture | Flutter | Compatibilité |
| player_version | Flutter | Updates |
| app_build | Flutter | Versioning |
| ip_address | Headers | GeoIP (futur) |

### À chaque status check

| Donnée | Source | Usage |
|--------|--------|-------|
| ip_address | Headers | GeoIP, sécurité |
| last_seen | Serveur | Activité |

---

## Logs d'actions

Chaque action importante est loggée dans `device_action_logs` :

```json
{
  "id": "uuid",
  "device_id": "a1b2c3d4...",
  "action": "register | status_check | activate | ban | ...",
  "details": { ... },
  "admin_id": "uuid | null",
  "ip_address": "192.168.1.100",
  "created_at": "2026-01-21T10:30:00Z"
}
```
