# Nova Player - Guide Admin Panel

> **Version:** 1.0.0  
> **Last Updated:** 2026-01-21

Guide d'utilisation du panel d'administration Nova Player.

---

## Accès au Panel

### URL

```
https://[votre-domaine]/login
```

### Connexion

1. Entrez votre email admin
2. Entrez votre mot de passe
3. Cliquez sur "Se connecter"

> **Note:** Seuls les utilisateurs avec un rôle admin peuvent se connecter.

---

## Dashboard

Le dashboard affiche un aperçu global :

### Statistiques principales

| Métrique | Description |
|----------|-------------|
| **Total Devices** | Nombre total de devices enregistrés |
| **Active** | Devices avec statut `active` |
| **Trial** | Devices en période d'essai |
| **Banned** | Devices bannis |

### Répartition par plateforme

Graphique montrant la distribution des devices par OS :
- Android
- iOS
- Windows
- Mac

### Top pays

Liste des pays avec le plus de devices.

---

## Liste des Devices

### Accès

Menu latéral → **Devices**

### Colonnes

| Colonne | Description |
|---------|-------------|
| **UID** | Identifiant public (NVP-XXXXXX) |
| **Device** | Modèle et version OS |
| **Platform** | Icône de la plateforme |
| **Status** | Badge coloré du statut |
| **Days Left** | Jours restants (trial) |
| **Last Seen** | Dernière activité |
| **Actions** | Boutons d'action |

### Filtres

- **Status** : Trial, Active, Expired, Banned
- **Platform** : Android, iOS, Windows, Mac
- **Search** : Recherche par device_id ou UID

### Actions rapides

| Bouton | Action |
|--------|--------|
| 👁️ | Voir les détails |
| ✅ | Activer |
| 🚫 | Bannir |
| ➕ | Étendre trial |

---

## Détail d'un Device

### Accès

Cliquez sur un device dans la liste → Page de détail

### Sections

#### 1. Identification

| Champ | Description |
|-------|-------------|
| **UID** | Identifiant public (copiable) |
| **Device ID** | Identifiant technique |
| **PIN créé le** | Date de création du PIN |
| **🔄 Régénérer PIN** | Bouton pour nouveau PIN |

#### 2. Informations Device

- Plateforme
- Version OS
- Modèle
- Architecture
- Version Player
- Build de l'app

#### 3. Réseau

- Adresse IP
- Pays
- Ville
- FAI
- VPN détecté

#### 4. Statut

| Champ | Description |
|-------|-------------|
| **Status** | trial / active / expired / banned |
| **Trial Start** | Date début essai |
| **Trial End** | Date fin essai |
| **Days Left** | Jours restants |
| **Extended Count** | Nombre d'extensions |
| **Manual Override** | Verrouillage status |

#### 5. Timestamps

- First Seen
- Last Seen
- Created At
- Updated At

#### 6. Notes

Zone de texte pour ajouter des notes internes.

---

## Actions sur un Device

### Changer le statut

```
Sélectionner nouveau statut → Confirmer
```

| Transition | Effet |
|------------|-------|
| → Trial | Réinitialise la période d'essai |
| → Active | Active la licence |
| → Expired | Expire immédiatement |
| → Banned | Bloque l'accès |

### Étendre le trial

```
Cliquer "Étendre" → +7 jours ajoutés
```

- Ajoute 7 jours à `trial_end`
- Incrémente `extended_count`
- Logged dans les actions

### Régénérer le PIN

```
Cliquer "Régénérer PIN" → Confirmer → Copier nouveau PIN
```

⚠️ **Important :**
- L'ancien PIN devient immédiatement invalide
- Le nouveau PIN n'est affiché qu'**UNE SEULE FOIS**
- Copiez-le avant de fermer la modale!

### Ajouter une note

```
Écrire dans le champ Notes → Sauvegarder
```

Les notes sont visibles uniquement par les admins.

---

## Historique des Actions

### Emplacement

Page détail device → Section "Activity Log"

### Actions loggées

| Action | Description |
|--------|-------------|
| `register` | Enregistrement initial |
| `status_check` | Vérification de status |
| `activate` | Activation par admin |
| `ban` | Bannissement |
| `unban` | Débannissement |
| `extend_trial` | Extension trial |
| `regenerate_pin` | Régénération PIN |
| `add_note` | Ajout de note |

### Informations par log

- Date/heure
- Type d'action
- Admin responsable
- Détails (JSON)
- IP source

---

## Actions groupées (Batch)

### Sélection

1. Cocher les devices souhaités
2. Cliquer sur l'action groupée

### Actions disponibles

| Action | Effet |
|--------|-------|
| **Ban Selected** | Bannit tous les devices sélectionnés |
| **Unban Selected** | Débannit les devices |
| **Extend Trial** | Ajoute 7 jours à tous |
| **Expire All** | Expire tous les devices |

---

## Gestion des Admins

### Accès

Menu latéral → **Admins** (Super Admin uniquement)

### Rôles

| Rôle | Permissions |
|------|-------------|
| **Super Admin** | Accès complet + gestion admins |
| **Admin** | Gestion devices complète |
| **Moderator** | Lecture seule + notes |

### Ajouter un admin

1. L'utilisateur doit d'abord créer un compte
2. Super Admin → Admins → Ajouter
3. Entrer l'email de l'utilisateur
4. Sélectionner le rôle

---

## Paramètres

### Accès

Menu latéral → **Settings**

### Options disponibles

- Informations du profil admin
- Préférences d'affichage
- Paramètres de notification (futur)

---

## Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+K` | Recherche rapide |
| `Esc` | Fermer modale |

---

## Troubleshooting

### "Unauthorized" à la connexion

- Vérifiez que votre compte a un rôle admin dans `admin_roles`
- Contactez un Super Admin

### Device non trouvé

- Vérifiez l'orthographe du device_id ou UID
- Le device doit avoir appelé `/device-register` au moins une fois

### PIN régénéré perdu

- Aucune récupération possible
- Régénérez un nouveau PIN

### Logs d'actions manquants

- Les logs sont conservés indéfiniment
- Vérifiez les filtres de date

---

## Support

Pour toute question technique :
- Consultez la documentation API : `docs/API_CONTRACT.md`
- Consultez les règles UID/PIN : `docs/UID_PIN_RULES.md`
