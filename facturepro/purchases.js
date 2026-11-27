// Abonnement Pro via RevenueCat (achats intégrés Google Play).
// 1) Crée l'app dans RevenueCat, copie la clé SDK Android (commence par "goog_") ci-dessous.
// 2) Dans RevenueCat : entitlement "pro", et une offering par défaut avec ton abonnement Google Play.
import { Alert } from 'react-native';
import Purchases from 'react-native-purchases';

export const FREE_LIMIT = 3;
const API_KEY = 'goog_REMPLACER_PAR_VOTRE_CLE_REVENUECAT';
const ENTITLEMENT = 'pro';
let configured = false;

export function initPurchases() {
  if (configured || API_KEY.includes('REMPLACER')) return;
  try {
    Purchases.configure({ apiKey: API_KEY });
    configured = true;
  } catch (e) {}
}

const hasPro = (info) => !!(info && info.entitlements && info.entitlements.active && info.entitlements.active[ENTITLEMENT]);

export async function isPro() {
  if (!configured) return false;
  try {
    return hasPro(await Purchases.getCustomerInfo());
  } catch (e) {
    return false;
  }
}

// Retourne true si l'achat a réussi
export async function startSubscription() {
  if (!configured) {
    Alert.alert('Bientôt disponible', "L'abonnement n'est pas encore activé.");
    return false;
  }
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current && offerings.current.availablePackages[0];
    if (!pkg) {
      Alert.alert('Indisponible', "Aucune offre n'est disponible pour le moment.");
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasPro(customerInfo);
  } catch (e) {
    if (!e.userCancelled) Alert.alert('Erreur', "L'achat n'a pas pu être finalisé.");
    return false;
  }
}

export async function restorePurchases() {
  if (!configured) return false;
  try {
    return hasPro(await Purchases.restorePurchases());
  } catch (e) {
    return false;
  }
}
