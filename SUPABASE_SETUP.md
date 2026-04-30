# Connexion Supabase <-> Render (RCCB)

## 1) Créer la table dans Supabase (SQL Editor)
```sql
create table if not exists public.inscriptions (
  id bigint generated always as identity primary key,
  nom text not null,
  prenom text not null,
  age int not null,
  sexe text not null,
  profession text,
  telephone text,
  email text,
  photo text,
  vicariat text not null,
  paroisse text not null,
  commentaires text,
  created_at timestamptz not null default now()
);
```

## 2) Variables Render
Dans Render > Service > Environment, ajoute exactement:
- `SUPABASE_URL` = `https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = ta clé `service_role` (pas anon)

Puis **Manual Deploy > Clear build cache & deploy**.

## 3) Vérifier
- `https://rccb.onrender.com/api/health`
  - doit retourner: `{ "ok": true, "storage": "supabase" }`

## 4) Causes fréquentes d'échec
- Mauvaise clé (`anon` au lieu de `service_role`)
- `SUPABASE_URL` avec slash ou mauvais projet
- Table `inscriptions` non créée
- RLS activé sans policy (si tu passes par clé anon côté frontend)

## 5) Important
Le backend actuel utilise la clé service role uniquement côté serveur (Render), ce qui évite d'exposer les secrets au navigateur.


⚠️ Ne laisse jamais `https://<project-ref>.supabase.co` tel quel. Copie la valeur réelle depuis Supabase > Settings > API > Project URL.
