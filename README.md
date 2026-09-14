# AxiumZ — Site officiel

Site vitrine premium pour AxiumZ, centre d'accompagnement scolaire et
linguistique à Casablanca. Construit en React, TypeScript, Vite, Tailwind CSS
et Framer Motion, avec une architecture i18n complète (français / anglais).

## Démarrer en local

```bash
npm install
npm run dev
```

Le site est servi sur `http://localhost:5173`.

## Build de production

```bash
npm run build
npm run preview   # pour vérifier le build localement
```

Le résultat est généré dans `dist/`.

## Déploiement

Le site est une SPA (Single Page Application) : le serveur doit rediriger
toutes les routes inconnues vers `index.html` pour que le routage
côté client fonctionne.

- **Netlify** : le fichier `public/_redirects` est déjà configuré.
- **Vercel** : le fichier `vercel.json` est déjà configuré.
- **Autre hébergeur (nginx, Apache, etc.)** : configurer un fallback SPA
  standard (`try_files $uri /index.html;` pour nginx).

## Architecture

```
src/
  components/     Composants réutilisables (Navigation, Footer, CTA, etc.)
  pages/          Une page par route (Home, Centre, Activites, ...)
  i18n/           Dictionnaires FR / EN + logique de routage multilingue
  data/           Données factuelles indépendantes de la langue (contact, coords)
  hooks/          Hooks partagés (scroll, meta SEO)
  layouts/        RootLayout (nav + footer) et PageResolver (résolution des slugs)
```

## Internationalisation

- Français par défaut : `/fr`, `/fr/activites`, `/fr/methodologie`, ...
- Anglais : `/en`, `/en/activites`, `/en/methodology`, `/en/registration`, ...
- Chaque page définit sa clé (`PageKey`) dans `src/i18n/config.ts`, qui gère
  la correspondance des slugs entre les deux langues.
- Aucune chaîne de caractères n'est codée en dur dans les composants : tout
  provient de `src/i18n/fr/index.ts` et `src/i18n/en/index.ts`.

## Mon espace

`/fr/mon-espace` et `/en/mon-espace` sont des pages "bientôt disponible"
volontairement sans authentification ni tableau de bord factice. L'architecture
(routes dédiées, layout partagé) permet de brancher un vrai espace élève
plus tard sans reconstruire le site.

## Contenu

Toutes les informations (activités, méthodologie, programmes, chiffres,
coordonnées) proviennent du site existant axiumz.com. Aucune donnée n'a été
inventée (pas de faux témoignages, certifications, chiffres ou partenaires).
