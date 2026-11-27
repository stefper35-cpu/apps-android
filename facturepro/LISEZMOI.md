# facturepro

## Lancer l'app sur ton téléphone (5 minutes)
1. Installe Node.js (nodejs.org) sur ton ordinateur.
2. Dans ce dossier : `npm install` puis `npx expo install --fix` (aligne les versions).
3. `npx expo start`, puis scanne le QR code avec l'app **Expo Go** (iOS/Android).

## Publier sur les stores
- Change `bundleIdentifier` et `package` dans app.json.
- `npm i -g eas-cli`, puis `eas build --platform all` et `eas submit`.
- Comptes requis : Apple Developer (99 $/an) et Google Play (25 $ une fois).

## Paiement (obligatoire avant publication)
Les abonnements dans une app doivent passer par les achats intégrés Apple/Google (commission 15 à 30 %), pas par Stripe.
Le plus simple : RevenueCat. Il suffit de remplir `isPro()` et `startSubscription()` dans purchases.js.
Crée l'abonnement dans App Store Connect et Google Play Console, avec le même identifiant.

## À ajouter avant de publier
Icône et écran de lancement (app.json), politique de confidentialité (exigée par les stores).
