# Déploiement Vercel

## Pourquoi Vercel peut corriger le problème Render

Vercel ne règle pas la persistance à lui seul: il faut une base externe ou un stockage durable. Le projet utilise maintenant Postgres/Supabase comme base principale et un fichier JSON de secours pour éviter que le site s'arrête quand Supabase est indisponible.

Ce projet est maintenant prêt pour Vercel avec:

- `api/index.js` pour exposer Express comme fonction Vercel.
- `vercel.json` pour envoyer les requêtes vers Express.
- une bascule automatique vers la sauvegarde de secours si Postgres tombe ou dépasse le timeout.

## Étapes

1. Créer ou vérifier le projet Supabase.
2. Copier l'URL Postgres du pooler transaction Supabase.
3. Pousser le repo sur GitHub.
4. Dans Vercel, cliquer sur `Add New Project`, puis importer le repo.
5. Dans `Settings > Environment Variables`, ajouter:
   - `DATABASE_URL`: URL Postgres/Supabase.
   - `ADMIN_TOKEN`: mot de passe admin.
   - `PGSSL`: `require` si besoin.
   - `RCCB_DB_TIMEOUT_MS`: `3500`.
   - `RCCB_DB_RETRY_MS`: `30000`.
6. Déployer.
7. Ouvrir `/api/health`.

Réponse attendue:

```json
{
  "ok": true,
  "storage": "postgres+backup",
  "databaseConfigured": true
}
```

## Réglages Vercel

- Framework Preset: `Other`.
- Build Command: laisser vide ou utiliser `npm install`.
- Output Directory: laisser vide.
- Install Command: `npm install`.

Vercel installe les dépendances depuis `package-lock.json`.

## Limite importante sur Vercel

Les fonctions Vercel ont un système de fichiers en lecture seule, avec seulement `/tmp` en écriture. `/tmp` sert de tampon temporaire, pas de stockage long terme.

Donc sur Vercel:

- si Supabase fonctionne: données persistantes dans Supabase + copie temporaire locale;
- si Supabase tombe brièvement: le site peut continuer en mode secours;
- si Supabase reste indisponible et que Vercel change d'instance: `/tmp` peut disparaître.

Pour garantir zéro perte même sans Supabase, il faut ajouter un deuxième stockage durable externe, ou déployer sur un serveur avec disque persistant et définir `RCCB_BACKUP_FILE`.

## Supabase conseillé pour Vercel

Utiliser le pooler transaction, généralement sous cette forme:

```text
postgres://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:6543/postgres
```

Le port `6543` est adapté aux fonctions serverless.

## Vérifications après déploiement

- `/api/health` doit afficher `storage: "postgres+backup"` quand Supabase fonctionne.
- vérifier `backupDurable`; `false` signifie secours temporaire seulement.
- `/admin/login` doit accepter `ADMIN_TOKEN`.
- Faire une inscription test avec photo.
- Dans `/admin`, créer une sauvegarde de présence.
- Télécharger l'Excel `.xlsx` et vérifier que la photo s'affiche dans Excel.

## Erreurs fréquentes

- `DATABASE_URL manquant`: la variable n'est pas ajoutée dans Vercel ou pas activée pour l'environnement courant.
- `password authentication failed`: mot de passe Supabase incorrect.
- `getaddrinfo` ou connexion impossible: mauvaise URL pooler, mauvais port ou projet Supabase en pause.
- Les photos n'apparaissent pas dans Excel: vérifier que le téléchargement utilise `.xlsx`, pas un ancien `.csv` ou `.xls`.
