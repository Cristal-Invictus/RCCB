# RCCB Inscriptions

Plateforme d'inscription RCCB Bénin avec formulaire public, tableau de bord admin, sauvegardes de présence et exports CSV/Excel.

## Point important

Les inscriptions et les sauvegardes sont écrites dans Postgres/Supabase quand `DATABASE_URL` fonctionne. En plus, le serveur garde une sauvegarde JSON locale pour que le site continue à fonctionner si Supabase est lent ou indisponible.

Pour ne pas perdre les données, cette sauvegarde locale doit être placée sur un disque persistant avec `RCCB_BACKUP_FILE`. Sur Vercel, le dossier `/tmp` est seulement un secours temporaire; il ne remplace pas une vraie base ou un stockage durable.

## Lancer en local

```bash
npm install
npm start
```

Puis ouvrir `http://localhost:3000`.

Sans base locale, le serveur démarre sur le fichier de secours pour tester rapidement. Pour forcer ce mode:

```bash
RCCB_USE_MEMORY_DB=1 npm start
```

## Variables d'environnement

- `DATABASE_URL`: URL Postgres/Supabase. Obligatoire en production.
- `ADMIN_TOKEN`: mot de passe admin. Recommandé en production.
- `PGSSL`: optionnel. Utiliser `require` pour forcer SSL, `disable` pour le désactiver en local.
- `RCCB_BACKUP_FILE`: chemin du fichier JSON de secours. Exemple: `/data/rccb-backup.json`.
- `RCCB_DB_TIMEOUT_MS`: délai max d'attente Postgres avant bascule secours. Défaut: `3500`.
- `RCCB_DB_RETRY_MS`: délai avant de retenter Postgres après échec. Défaut: `30000`.
- `RCCB_USE_MEMORY_DB`: optionnel. `1` ignore `DATABASE_URL` et utilise seulement le fichier de secours.

## Déploiement Vercel

Le projet contient:

- `api/index.js`: entrée serverless Express pour Vercel.
- `vercel.json`: redirection globale vers Express, comme recommandé pour une app Express sur Vercel.

Procédure courte:

1. Pousser ce dépôt sur GitHub.
2. Importer le repo dans Vercel.
3. Ajouter `DATABASE_URL` et `ADMIN_TOKEN` dans les Environment Variables Vercel.
4. Déployer.
5. Vérifier `https://ton-domaine.vercel.app/api/health`.

Pour Supabase avec Vercel, utiliser de préférence l'URL du pooler en mode transaction sur le port `6543`.

Réponse attendue de `/api/health`:

```json
{
  "ok": true,
  "storage": "postgres+backup",
  "databaseConfigured": true
}
```

Si `storage` vaut `backup`, le site fonctionne en mode secours. Si `backupDurable` vaut `false`, il faut corriger le stockage avant d'utiliser ça comme production longue durée.

## Exports

- CSV: `/api/inscriptions.csv`
- Excel avec photos intégrées: `/api/inscriptions.xlsx`
- Sauvegarde Excel: `/api/presence-saves/:id.xlsx`

L'export Excel génère un vrai fichier `.xlsx`; les photos sont embarquées dans le classeur, pas seulement copiées en texte base64.

## Personnaliser vicariats / paroisses

Modifier `VICARIATS_PAROISSES` dans `public/app.js`.

## Documentation utile

- `SUPABASE_SETUP.md`: configuration Supabase/Postgres.
- `VERCEL_DEPLOY.md`: déploiement Vercel pas à pas.
