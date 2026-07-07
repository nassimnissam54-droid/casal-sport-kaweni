# Casal Sport Kaweni — Site e-commerce click & collect

Site de vente en ligne pour le magasin **Casal Sport** de Kawéni (Mamoudzou, Mayotte).
Les clients commandent en ligne, paient comme ils veulent, et **retirent leur commande
au magasin** avec un code de retrait reçu par e-mail. **Aucune livraison.**

## Stack

- **Front** : HTML/CSS/JS vanilla (aucun framework), Three.js (hero 3D), GSAP (scroll cinématique)
- **Back** : Netlify Functions + Netlify Blobs (commandes, catalogue, stock)
- **E-mail** : [Resend](https://resend.com) (reçu de commande + copie magasin)
- **Paiement en ligne** : lien de paiement SumUp ou Stripe (configurable)

## Déploiement (GitHub → Netlify)

1. Pousser ce repo sur GitHub.
2. Sur [app.netlify.com](https://app.netlify.com) : **Add new site → Import an existing project → GitHub** → choisir ce repo.
3. Netlify lit `netlify.toml` automatiquement (publish `.`, functions `netlify/functions`). Cliquer **Deploy**.
4. Configurer les **variables d'environnement** (Site configuration → Environment variables) — voir ci-dessous.
5. Redéployer après ajout des variables (Deploys → Trigger deploy).

## Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ | Mot de passe de la page `admin.html` (vérifié côté serveur) |
| `RESEND_API_KEY` | Recommandé | Clé API Resend pour l'envoi des reçus e-mail. Sans elle, la commande fonctionne mais aucun e-mail n'est envoyé (le code de retrait reste affiché à l'écran). |
| `EMAIL_FROM` | Recommandé | Expéditeur des reçus, ex : `Casal Sport Kaweni <recu@votredomaine.com>` (domaine vérifié dans Resend) |
| `STORE_EMAIL` | Recommandé | E-mail du magasin — reçoit une copie de chaque commande |
| `PAYMENT_LINK_URL` | Optionnel | Lien de paiement en ligne (SumUp/Stripe). Placeholders `{amount}` et `{ref}` remplacés par le montant et le n° de commande, sinon ajoutés en paramètres d'URL. Sans cette variable, l'option « carte en ligne » enregistre la commande avec paiement au retrait. |
| `BANK_IBAN` | Optionnel | IBAN affiché dans le reçu pour le paiement par virement |
| `STORE_NAME`, `STORE_ADDRESS`, `STORE_PHONE`, `STORE_HOURS` | Optionnel | Infos magasin dans les reçus (des valeurs par défaut existent) |

## À personnaliser avant la mise en ligne

- **Coordonnées du magasin** : `js/store.js` (constante `STORE`) + pages `contact.html`, `mentions.html` (SIRET, raison sociale…).
- **Produits** : `data/products.json` (catalogue initial) — ensuite gérable depuis `admin.html`
  (les modifications admin sont stockées dans Netlify Blobs et priment sur le fichier).
- **Photos produits** : remplacer les SVG de `img/` par de vraies photos (WebP recommandé, 800×800),
  puis mettre à jour le champ `image` des produits.
- **Modèles 3D du hero** : `js/hero3d.js`, constante `GLB_MODELS` — placer vos `.glb` dans `/models`
  (compression DRACO supportée). Par défaut, trois produits stylisés en primitives s'affichent.
- **Domaine** : remplacer `casal-sport-kaweni.netlify.app` dans `robots.txt` et `sitemap.xml`
  par votre domaine définitif.

## Fonctionnement

- **Commande** : le client valide son panier → `POST /api/create-order` recalcule les prix côté
  serveur, vérifie le stock, génère un code de retrait `CS-XXXX-XXXX`, enregistre la commande,
  décrémente le stock et envoie le reçu.
- **Admin** (`/admin.html`) : commandes (recherche par code de retrait, « Marquer retiré »,
  « Payé ») et CRUD produits. Auth vérifiée côté serveur via l'en-tête `x-admin-key`.
- **Formulaire de contact** : Netlify Forms (messages dans l'onglet Forms de Netlify).
- **Préview locale** : ouvrir le site en statique suffit pour le front ; le checkout passe en
  mode démo sur `localhost` (aucun e-mail, commande non enregistrée). Pour tester les functions
  en local : `npx netlify dev`.

## Performance

- Three.js et GSAP chargés par CDN ; la 3D est **lazy-loadée** et désactivée si
  WebGL est absent ou si `prefers-reduced-motion` est actif (repli statique).
- Rendu WebGL mis en pause hors écran et onglet caché.
- Sur mobile : pixel ratio réduit, sol simplifié (pas de reflet temps réel).
- Cache HTTP configuré dans `netlify.toml`.
