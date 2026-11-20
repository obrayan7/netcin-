# NETCINÉ +

Plateforme de streaming (films, séries, saisons, épisodes), en **deux applications séparées** qui partagent la même base de données :

| Dossier | Rôle | Port dev | Domaine conseillé |
|---|---|---|---|
| `apps/web` | Site public (accueil 3D, catalogue, fiche, lecteur, recherche, comptes spectateurs) | 3000 | `netcine.com` |
| `apps/admin` | Espace d'administration (connexion, titres, saisons, épisodes, catégories, upload) | 3001 | `admin.netcine.com` |
| `packages/db` | Schéma Prisma + client partagé (`@netcine/db`) | — | — |

Le site n'expose **aucune** route d'administration. L'admin écrit dans la base et le stockage S3 ; le site les lit.
Ils sont reliés par : la base PostgreSQL commune, le bucket S3 commun, et des liens « Voir le site » / « Voir sur le site » dans l'admin (variable `NEXT_PUBLIC_SITE_URL`).

> Utilisez uniquement des contenus dont le client détient les droits de diffusion.

## Fonctions du site public

- **Accueil** : anneau 3D d'affiches, « Reprendre la lecture » (avec barres de progression), « Ma liste », « Top 10 du moment » (grands chiffres), « Ajouts récents », une rangée par catégorie, flèches de défilement.
- **Cartes** : au survol, boutons Lecture / Ma liste / J'aime / Plus d'infos, classification, durée ou nombre de saisons, genres. Badges « Nouveau » et « Nouvel épisode » (14 jours).
- **Fiche en fenêtre** : un clic sur une affiche ouvre la fiche en superposition (Échap ou clic à côté pour fermer) ; l'adresse `/title/ID` reste ouvrable en page complète. Elle montre l'année, la classification, la durée, la distribution, les genres, « Ce titre est », les langues audio, la liste d'épisodes avec choix de saison et « Dans le même genre ».
- **Comptes spectateurs** : inscription et connexion par email, menu avatar, Ma liste, J'aime, reprise de lecture (enregistrée toutes les 10 secondes), cloche de nouveautés avec compteur.
- **Lecteur** : MP4 ou HLS ; reprise à la dernière position ; choix de la langue audio quand le flux HLS contient plusieurs pistes.
- **Pied de page** et squelettes de chargement.

Dans l'admin : champs *Distribution, Genres, Ce titre est, Langues audio* et *Place dans le Top 10 (1 à 10)* sur chaque titre, et une page **Membres** (liste des comptes créés).

## Tester en local

Prérequis : Node.js 20 LTS ou plus, et une base PostgreSQL (au choix : Docker, ou une base gratuite Neon).

```bash
# 1. Base PostgreSQL locale (Docker) — ou utilisez l'URL d'une base Neon
docker run -d --name netcine-db -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=netcine -p 5432:5432 postgres:16
#    => DATABASE_URL="postgresql://postgres:pass@localhost:5432/netcine"

# 2. Installation (génère aussi le client Prisma)
npm install

# 3. Fichiers .env (sous Windows PowerShell : copy au lieu de cp)
cp packages/db/.env.example packages/db/.env
cp apps/web/.env.example    apps/web/.env
cp apps/admin/.env.example  apps/admin/.env
#    Mettre la même DATABASE_URL dans les 3 fichiers, un AUTH_SECRET long dans apps/admin/.env
#    ET dans apps/web/.env (deux valeurs différentes de préférence),
#    et ADMIN_EMAIL / ADMIN_PASSWORD dans packages/db/.env

# 4. Tables + compte admin
npm run db:push
npm run db:seed

# 5. Lancer les deux applications (2 terminaux)
npm run dev:web      # http://localhost:3000   (site public)
npm run dev:admin    # http://localhost:3001   (admin)
```

**Sans stockage S3 (test rapide)** : dans l'admin, chaque champ image/vidéo accepte aussi une **URL collée**. Utilisez des liens publics, par exemple une affiche `https://picsum.photos/400/600` et une vidéo MP4 de test. Le bouton d'envoi de fichier ne fonctionne qu'une fois les variables `S3_*` et le CORS du bucket configurés.

Parcours de test : connexion sur `localhost:3001` → *Catégories* (vérifier les 3 rangées) → *Ajouter un titre* (film avec affiche + vidéo, coché *À la une*) → ouvrir `localhost:3000` : l'anneau 3D affiche l'affiche, la fiche s'ouvre au clic et la vidéo se lit. Côté spectateur : créer un compte sur `localhost:3000/register`, ajouter un titre à Ma liste (bouton + au survol), lancer une vidéo, quitter puis revenir : la rangée « Reprendre la lecture » apparaît.

> Si vous mettez à jour depuis une version précédente, relancez `npm run db:push` : de nouvelles tables (membres, liste, j'aime, progression) et de nouveaux champs sont ajoutés.

## Hébergement gratuit : Vercel + Neon + Cloudflare R2

| Besoin | Service gratuit | Limites gratuites vérifiées (nov. 2026) |
|---|---|---|
| Site + admin | Vercel (offre Hobby) | 100 Go de transfert, 1 M d'invocations, 4 h de CPU actif par mois |
| Base de données | Neon (PostgreSQL) | 1 Go de stockage par projet, 100 h de calcul par mois, veille après 5 min |
| Images et vidéos | Cloudflare R2 | 10 Go de stockage, sortie de données gratuite |

> **Important** : l'offre Hobby de Vercel est réservée à un usage personnel, non commercial (conditions d'utilisation de Vercel). Pour un site client rémunéré, prévoir l'offre Pro (20 $ par mois et par développeur) ou un autre hébergeur. Les vidéos ne passent pas par Vercel (elles sont servies par R2), ce qui préserve le quota.

1. **Dépôt GitHub** : poussez tout le dossier `netcine` (le `.gitignore` exclut `.env` et `node_modules`).
2. **Neon** : créez un projet, copiez deux chaînes de connexion : la **directe** (pour `db:push` et `db:seed`, depuis votre PC) et la **poolée** (nom d'hôte avec `-pooler`, pour Vercel, à terminer par `?sslmode=require&pgbouncer=true`).
3. **Tables et admin** : en local, mettez la chaîne *directe* dans `packages/db/.env`, puis `npm run db:push` et `npm run db:seed`.
4. **Cloudflare R2** : créez un bucket, activez l'accès public (domaine `r2.dev` ou domaine personnalisé), créez une clé API S3, et collez le CORS ci-dessous avec l'adresse de l'admin.
5. **Vercel, projet « site »** : *Add New → Project* → importez le dépôt → *Root Directory* = `apps/web` → variables `DATABASE_URL` (chaîne poolée) et `AUTH_SECRET` → *Deploy*.
6. **Vercel, projet « admin »** : importez **le même dépôt une seconde fois** → *Root Directory* = `apps/admin` → variables `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` (adresse du projet site), `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_URL` → *Deploy*.
7. **Domaines** (optionnel) : *Settings → Domains* dans chaque projet (`netcine.com` pour le site, `admin.netcine.com` pour l'admin). Mettez à jour `NEXT_PUBLIC_SITE_URL` et le CORS du bucket avec l'adresse définitive.

Si Vercel affiche « Query engine library not found » (Prisma en monorepo) : ajouter la dépendance `@prisma/nextjs-monorepo-workaround-plugin` et l'activer dans `next.config.mjs`, ou relancer le déploiement en vidant le cache de build.

## Séries : importer une saison depuis un dossier

Dans l'admin, la page d'accueil a deux boutons :
- **Ajouter un nouveau (film, série ou animé)** : en choisissant « Série » ou « Animé », une zone « Importer une saison » apparaît. On indique le numéro de la saison et on choisit le dossier qui contient tous les épisodes.
- **Ajouter une saison à une série existante** : on choisit la série déjà publiée, le numéro (la saison suivante est proposée), puis le dossier.

Le dossier est trié dans l'ordre naturel (Épisode 2 avant Épisode 10). Le numéro de chaque épisode est lu dans le nom du fichier (S01E03, E03, Episode 3, « 03 - Titre »…) ; sinon les épisodes sont numérotés 1, 2, 3… dans l'ordre alphabétique. Numéros et titres restent modifiables avant l'envoi. Les vidéos partent directement vers le bucket (2 à la fois, avec barre de progression), puis un clic sur « Créer » / « Ajouter la saison » enregistre tous les épisodes. Si la saison existe déjà, les épisodes de même numéro sont remplacés. Format conseillé : MP4 (H.264) ; les .mkv/.avi ne se lisent pas dans un navigateur.

Sur le site, la fiche d'une série affiche « Épisodes » avec une liste déroulante des saisons, puis les épisodes de la saison choisie (10 d'abord, « Afficher tout » pour le reste). Les animés ont leur page « Animés ». Après mise à jour : `npm run db:push` (nouveau type « Animé »).

## Lecteur

Pendant la lecture : bouton **✕** (en haut à droite) pour fermer le lecteur et revenir à la fiche, bouton **Suivant** (en bas à droite) pour passer à l'épisode suivant, y compris d'une saison à la suivante. Les boutons apparaissent au mouvement de la souris ou au toucher et se masquent après 3 s. Le plein écran passe par le bouton ⛶ du lecteur pour conserver ces boutons.

## Abonnement (mode payant)

Depuis l'admin, page **Abonnement** :
- **Activer le mode payant** : désactivé = tout est gratuit ; activé = la règle s'applique.
- **Prix** (750 par défaut), devise (F CFA), durée (30 jours), **part gratuite** (50 % par défaut).
- Règle : les épisodes sont comptés dans l'ordre (saison 1, 2, 3…). Avec 3 saisons de 8 épisodes, 50 % = les 12 premiers gratuits ; au-delà, un message propose l'abonnement. Si le client ajoute des épisodes, le seuil se recalcule seul.
- Option « les films exigent aussi l'abonnement » (décochée par défaut : films gratuits).
- Le blocage est fait **côté serveur** : l'URL de la vidéo n'est jamais envoyée à un non-abonné.

Page **Paiements** (admin) : liste des paiements, nombre d'abonnés, validation manuelle.

**FedaPay** (paiement en ligne) : dans le projet Vercel du site, ajoutez `FEDAPAY_SECRET_KEY` (clé secrète, FedaPay > Paramètres > Clés API), `FEDAPAY_ENV` (`sandbox` pour tester, `live` pour de vrais paiements) et `SITE_URL` (adresse publique du site). Dans FedaPay > Webhooks, ajoutez `https://VOTRE-SITE/api/fedapay/webhook` (événements transaction.approved, declined, canceled). Le site relit toujours la transaction chez FedaPay avant d'activer un abonnement.
Sans clé FedaPay, remplissez « Instructions de paiement manuel » dans l'admin : le spectateur déclare son paiement et vous le validez.
Après mise à jour, relancez `npm run db:push` (nouvelles tables).

## Utilisation de l'admin

1. **Catégories** : crée les rangées de l'accueil et leur ordre.
2. **Titres → Ajouter** : Film ou Série, nom, synopsis, affiche, bannière.
   - Film : envoyer la vidéo (ou coller une URL MP4 / `.m3u8`).
   - Série : créer le titre, puis *Ajouter une saison* et les épisodes (titre, résumé, miniature, vidéo).
3. Cocher *Publié* ; *À la une* place le titre en tête de l'anneau 3D de l'accueil.

## Bucket : CORS (obligatoire pour l'upload)

Le navigateur envoie les fichiers directement au bucket (URL présignée) depuis le domaine de l'**admin**.

```json
[
  {
    "AllowedOrigins": ["https://admin.netcine.com", "http://localhost:3001"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

`S3_PUBLIC_URL` doit être le domaine public (ou CDN) du bucket ; le site lit les vidéos et images à cette adresse.

## Charte

Couleurs du logo : rouge `#f80008`, rouge profond `#a00000`, argent `#dcdce2`, fond noir. Titres en Barlow italique gras (proche des lettres du logo), texte en Instrument Sans (Google Fonts, chargées au build).
Le logo se remplace dans `apps/web/public/logo.png` et `apps/admin/public/logo.png` ; l'icône d'onglet dans `src/app/icon.png` de chaque application.

## Limites connues / prochaines étapes

- **Un seul profil par compte** (pas de profils multiples ni de profil enfant) ; pas de réinitialisation de mot de passe par email (il faut un service d'envoi comme Resend).
- **Pas de pourcentage de correspondance** : il n'y a pas de moteur de recommandation. « Dans le même genre » s'appuie sur les catégories communes ; « J'aime » est enregistré mais ne personnalise pas encore l'accueil.
- **Top 10 manuel** : le classement est saisi dans l'admin (pas calculé automatiquement).
- **Langues audio** : la liste affichée sur la fiche est informative ; le changement de piste dans le lecteur n'existe que si le flux HLS (.m3u8) contient plusieurs pistes audio. Pas de sous-titres.
- **Abonnement / paiement** : non inclus (Stripe à ajouter si le client veut un accès payant).
- **Pas de transcodage** : un MP4 est lu tel quel. Pour du multi-qualité, utiliser Bunny Stream / Cloudflare Stream / Mux ou un job FFmpeg.
- **Vidéos publiques** : les URL du bucket sont publiques ; pour du contenu payant, passer à des URL signées ou au token du CDN.
- **Upload** : un seul `PUT` (5 Go max sur S3) ; au-delà, multipart.
- Les limiteurs de tentatives de connexion (admin et spectateurs) sont en mémoire (une seule instance) ; utiliser Redis en multi-instances.
- Code non exécuté dans l'environnement de création (pas d'accès réseau pour installer les dépendances) : lancer `npm run build:web` et `npm run build:admin` et corriger d'éventuelles erreurs de typage mineures.
