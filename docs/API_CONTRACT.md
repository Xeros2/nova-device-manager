# Nova Player - API Contract

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-21  
> **Status:** Production Ready

Ce document définit le contrat API entre le backend Nova Player Core et les applications clientes (Flutter).

---

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://kcverunpdrbiiyeqekzw.supabase.co/functions/v1` |

---

## Headers requis

```http
Content-Type: application/json
```

---

## Endpoints Publics (Flutter)

### POST `/device-register`

Enregistrement initial d'un device. Appelé à la **première ouverture** de l'application.

#### Request Body

```json
{
  "device_id": "string (required)",
  "platform": "android | ios | windows | mac (required)",
  "os_version": "string (required)",
  "device_model": "string (required)",
  "architecture": "arm64 | x64 (required)",
  "player_version": "string (required)",
  "app_build": "number (required)"
}
```

#### Response - Nouveau Device (201 Created)

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

> ⚠️ **IMPORTANT:** Le `pin` n'est retourné qu'**UNE SEULE FOIS** à la création du device.

#### Response - Device Existant (200 OK)

```json
{
  "status": "trial | active | expired | banned",
  "uid": "NVP-7F3A9C",
  "days_left": 5,
  "trial_end": "2026-02-10",
  "manual_override": false
}
```

> Note: Le `pin` n'est **jamais** retourné pour un device existant.

#### Errors

| Code | Description |
|------|-------------|
| 400 | Missing required fields |
| 500 | Internal server error |

---

### POST `/device-status`

Vérification du statut d'un device. Appelé à **chaque lancement** de l'application.

#### Request Body

```json
{
  "device_id": "string (required)",
  "ip_address": "string (optional)"
}
```

#### Response (200 OK)

```json
{
  "status": "trial | active | expired | banned",
  "days_left": 5,
  "trial_end": "2026-02-10",
  "manual_override": false
}
```

#### Response - Device Not Found (404)

```json
{
  "error": "Device not found",
  "status": "unknown",
  "days_left": 0,
  "trial_end": null,
  "manual_override": false
}
```

---

## Endpoints Admin

### POST `/admin-regenerate-pin`

Régénère le PIN d'un device. **Réservé aux administrateurs.**

#### Headers

```http
Authorization: Bearer <admin_jwt_token>
```

#### Request Body

```json
{
  "device_id": "string (required)"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "new_pin": "738291",
  "device_id": "abc123...",
  "uid": "NVP-7F3A9C"
}
```

> ⚠️ **IMPORTANT:** Le nouveau `pin` n'est affiché qu'**UNE SEULE FOIS**.

#### Errors

| Code | Description |
|------|-------------|
| 400 | device_id is required |
| 401 | Unauthorized - Admin access required |
| 404 | Device not found |
| 500 | Internal server error |

---

## Types de Status

| Status | Description |
|--------|-------------|
| `trial` | Période d'essai active |
| `active` | Licence active (après activation) |
| `expired` | Période d'essai ou licence expirée |
| `banned` | Device banni par un admin |

---

## Règles de Gestion

### Calcul automatique des jours restants

```
days_left = max(0, ceil((trial_end - now) / 1 day))
```

### Expiration automatique

- Si `days_left == 0` et `status == 'trial'` → `status` devient `'expired'`
- Exception : Si `manual_override == true`, le status n'est pas modifié automatiquement

### Mise à jour last_seen

À chaque appel `/device-status`, le champ `last_seen` est mis à jour avec la date/heure actuelle.

---

## Exemple d'intégration Flutter

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class NovaPlayerAPI {
  static const String baseUrl = 'https://kcverunpdrbiiyeqekzw.supabase.co/functions/v1';

  /// Enregistre un nouveau device ou récupère le statut d'un device existant
  Future<Map<String, dynamic>> registerDevice({
    required String deviceId,
    required String platform,
    required String osVersion,
    required String deviceModel,
    required String architecture,
    required String playerVersion,
    required int appBuild,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/device-register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'device_id': deviceId,
        'platform': platform,
        'os_version': osVersion,
        'device_model': deviceModel,
        'architecture': architecture,
        'player_version': playerVersion,
        'app_build': appBuild,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to register device');
    }
  }

  /// Vérifie le statut d'un device
  Future<Map<String, dynamic>> checkStatus(String deviceId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/device-status'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'device_id': deviceId,
      }),
    );

    return jsonDecode(response.body);
  }
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial release with UID/PIN system |
