# RCCB Inscriptions (Version déployable)

Cette version utilise un backend Node.js + Express + SQLite.

## Pourquoi c'est mieux pour ton besoin
- Application partageable avec une URL (plusieurs utilisateurs en même temps).
- Données centralisées en base (pas seulement dans le navigateur d'une personne).
- Déploiement simple sur Render, Railway, VPS, etc.

## Lancer en local
```bash
npm install
npm start
```
Puis ouvrir http://localhost:3000

## Déploiement rapide (Render/Railway)
- Build command: `npm install`
- Start command: `npm start`
- Port: variable `PORT` déjà gérée.

## Personnaliser vicariats / paroisses
Modifier `VICARIATS_PAROISSES` dans `public/app.js`.

## Prochaine étape recommandée
Dès que tu m'envoies la liste officielle des vicariats + paroisses, je l'intègre directement.

## GitHub
Voir aussi `GITHUB_DEPLOY.md` pour la publication GitHub et le déploiement public.


## Supabase + Render
Voir `SUPABASE_SETUP.md` pour la configuration pas à pas.

- Le backend accepte soit `age`, soit `date_naissance` (calcul automatique de l'âge).

- Le champ `photo` stocke une URL/texte. Si le formulaire envoie un fichier brut, le backend l'ignore pour éviter une erreur serveur.
