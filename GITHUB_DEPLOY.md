# Publication GitHub + visualisation du produit final

Je ne peux pas publier automatiquement sur ton compte GitHub sans ton token/accès.

## 1) Publier ce projet sur ton GitHub
```bash
git remote -v
# si pas de remote:
git remote add origin https://github.com/<TON-USERNAME>/<TON-REPO>.git

git push -u origin HEAD
```

## 2) Voir le produit final
### Local
```bash
npm install
npm start
```
Puis ouvre `http://localhost:3000`.

### En ligne (partageable)
- Connecte le repo sur Render ou Railway
- Build command: `npm install`
- Start command: `npm start`
- Tu obtiens une URL publique à partager.

## 3) Import des vicariats/paroisses
Le script SQL fourni est PostgreSQL (tables `dioceses`, `vicariats`, `paroisses`).
Pour l'utiliser tel quel, il faut migrer la base vers PostgreSQL (au lieu de SQLite), puis exécuter ton script seed.
