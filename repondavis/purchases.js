// Abonnement Pro. Sur iOS/Android, les abonnements numériques DOIVENT passer par
// les achats intégrés (Apple/Google), pas par Stripe. La solution la plus simple :
// RevenueCat (npx expo install react-native-purchases), puis remplacer ces 2 fonctions.
import { Alert } from 'react-native';

export const FREE_LIMIT = 5;

export async function isPro() {
  // TODO RevenueCat : const info = await Purchases.getCustomerInfo();
  // return !!info.entitlements.active['pro'];
  return false;
}

export async function startSubscription() {
  // TODO RevenueCat : const offerings = await Purchases.getOfferings(); puis Purchases.purchasePackage(...)
  Alert.alert('Bientôt disponible', "L'achat Pro n'est pas encore branché (voir purchases.js).");
}
