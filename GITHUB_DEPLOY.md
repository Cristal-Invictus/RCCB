# Publication GitHub + Vercel

## 1. Publier ce projet sur GitHub

```bash
git remote -v
```

Si aucun remote n'est configuré:

```bash
git remote add origin https://github.com/<TON-USERNAME>/<TON-REPO>.git
git push -u origin HEAD
```

Si le remote existe déjà:

```bash
git push
```

## 2. Déployer sur Vercel

1. Ouvrir Vercel.
2. Importer le dépôt GitHub.
3. Choisir le preset `Other`.
4. Ajouter les variables:
   - `DATABASE_URL`
   - `ADMIN_TOKEN`
   - `PGSSL=require` si nécessaire.
5. Déployer.

Voir `VERCEL_DEPLOY.md` pour le détail.

## 3. Voir le produit final en local

```bash
npm install
npm start
```

Puis ouvrir `http://localhost:3000`.

## 4. Vérifier en ligne

- Site public: `https://ton-domaine.vercel.app/`
- Admin: `https://ton-domaine.vercel.app/admin/login`
- Santé API: `https://ton-domaine.vercel.app/api/health`

`/api/health` doit indiquer `storage: "postgres+backup"` et `backupDurable: true` en production durable.
