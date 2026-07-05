# Configuration Supabase/Postgres

Le backend utilise le module `pg` et attend une seule variable principale:

```text
DATABASE_URL=postgres://...
```

Il ne lit pas `SUPABASE_URL` ni `SUPABASE_SERVICE_ROLE_KEY`.

Le backend garde aussi une sauvegarde JSON locale. Si Supabase tombe, les routes continuent à lire et écrire dans cette sauvegarde, puis les lignes en attente sont resynchronisées vers Supabase quand Postgres revient.

## 1. Créer le projet Supabase

Dans Supabase:

1. Créer un projet.
2. Aller dans `Project Settings > Database > Connection string`.
3. Copier l'URL du pooler transaction si l'application est déployée sur Vercel.

Pour Vercel, privilégier le port `6543`:

```text
postgres://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:6543/postgres
```

## 2. Tables

Le serveur crée automatiquement les tables au démarrage ou au premier appel API:

```sql
create table if not exists inscriptions (
  id bigserial primary key,
  nom text not null,
  prenom text not null,
  date_naissance date not null,
  sexe text not null,
  situation_relationnelle text,
  profession text,
  telephone text,
  photo text,
  vicariat text not null,
  paroisse text not null,
  raison_presence text,
  canal_information text,
  commentaires text,
  presence_date date not null,
  created_at timestamptz not null
);

create table if not exists presence_saves (
  id bigserial primary key,
  presence_date date not null,
  saved_at timestamptz not null,
  participant_count integer not null default 0,
  rows jsonb not null
);
```

Tu peux aussi exécuter ce SQL manuellement dans Supabase SQL Editor.

## 3. Variables à ajouter dans Vercel

- `DATABASE_URL`: URL Postgres/Supabase.
- `ADMIN_TOKEN`: mot de passe de l'admin.
- `PGSSL`: `require` si Supabase exige SSL.
- `RCCB_DB_TIMEOUT_MS`: `3500` par défaut.
- `RCCB_DB_RETRY_MS`: `30000` par défaut.

## 4. Sauvegarde de secours

Par défaut:

- local/serveur classique: `data/rccb-backup.json`
- Vercel: `/tmp/rccb-backup.json`

Sur un serveur avec disque persistant, configure plutôt:

```text
RCCB_BACKUP_FILE=/data/rccb-backup.json
```

Important: sur Vercel, `/tmp` sert seulement de tampon temporaire. Il permet au site de ne pas se bloquer immédiatement, mais il ne garantit pas une conservation longue durée après changement d'instance.

## 5. Vérifier

Après déploiement:

```text
https://ton-domaine.vercel.app/api/health
```

La réponse doit indiquer:

```json
{
  "ok": true,
  "storage": "postgres+backup",
  "databaseConfigured": true,
  "backupDurable": true
}
```

Si `storage` vaut `backup`, Supabase/Postgres n'est pas disponible et le site travaille sur la sauvegarde de secours.

Si `backupDurable` vaut `false`, la sauvegarde est temporaire. Ce n'est pas suffisant pour garantir zéro perte en production.

## 6. Pourquoi les sauvegardes disparaissaient

Quand `DATABASE_URL` était absent ou inutilisable, le projet utilisait un stockage non durable. En production, un redémarrage, une mise en veille ou une nouvelle instance pouvait donc effacer les données.

Le correctif durable est maintenant double: Postgres/Supabase en base principale, plus sauvegarde JSON de secours sur stockage persistant.
