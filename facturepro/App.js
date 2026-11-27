import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, Alert, Platform, StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREE_LIMIT, isPro, startSubscription, restorePurchases, initPurchases } from './purchases';

const GREEN = '#0f7a5c';
const TVA_OPTIONS = [
  { label: 'Sans TVA', value: 0 },
  { label: '20 %', value: 20 },
  { label: '10 %', value: 10 },
  { label: '5,5 %', value: 5.5 },
];
const DELAIS = ['à réception', '15 jours', '30 jours', '45 jours'];

const eur = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
const num = (s) => parseFloat(String(s).replace(',', '.')) || 0;
const today = () => new Date().toLocaleDateString('fr-FR');
const monthKey = () => 'fp-used-' + new Date().toISOString().slice(0, 7);

export default function App() {
  const [type, setType] = useState('Facture');
  const [numero, setNumero] = useState('2026-001');
  const [date, setDate] = useState(today());
  const [me, setMe] = useState({ nom: '', adr: '', siret: '', contact: '', iban: '' });
  const [client, setClient] = useState({ nom: '', adr: '' });
  const [lines, setLines] = useState([{ d: 'Prestation de service', q: '1', p: '100' }]);
  const [tva, setTva] = useState(0);
  const [delai, setDelai] = useState('30 jours');
  const [used, setUsed] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  // Chargement du profil émetteur et du quota
  useEffect(() => {
    initPurchases();
    (async () => {
      try {
        const m = await AsyncStorage.getItem('fp-me');
        if (m) setMe(JSON.parse(m));
        const u = await AsyncStorage.getItem(monthKey());
        setUsed(parseInt(u, 10) || 0);
      } catch (e) {}
    })();
  }, []);
  useEffect(() => { AsyncStorage.setItem('fp-me', JSON.stringify(me)).catch(() => {}); }, [me]);

  const ht = lines.reduce((s, l) => s + num(l.q) * num(l.p), 0);
  const montantTva = (ht * tva) / 100;
  const ttc = ht + montantTva;

  const setLine = (i, k, v) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const addLine = () => setLines([...lines, { d: '', q: '1', p: '0' }]);
  const delLine = (i) => setLines(lines.length > 1 ? lines.filter((_, j) => j !== i) : lines);

  const mentions = () => {
    const m = [];
    if (tva === 0) m.push('TVA non applicable, art. 293 B du CGI.');
    if (type === 'Facture') {
      m.push('Conditions de paiement : ' + delai + '.');
      m.push("En cas de retard : pénalité de 3 fois le taux d'intérêt légal et indemnité forfaitaire de recouvrement de 40 €.");
      m.push('Pas d\'escompte pour paiement anticipé.');
      if (me.iban) m.push('IBAN : ' + me.iban);
    } else {
      m.push('Devis valable 30 jours. Bon pour accord : date et signature.');
    }
    return m;
  };

  const buildHtml = (withBrand) => {
    const rows = lines
      .map((l) => `<tr><td>${esc(l.d)}</td><td class="r">${esc(l.q)}</td><td class="r">${eur(num(l.p))}</td><td class="r">${eur(num(l.q) * num(l.p))}</td></tr>`)
      .join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#111;padding:28px}
      h1{font-size:24px;margin:0 0 4px} table{width:100%;border-collapse:collapse;margin:20px 0}
      th,td{padding:8px 6px;border-bottom:1px solid #ddd;text-align:left} .r{text-align:right}
      .tot{margin-left:auto;width:240px} .tot div{display:flex;justify-content:space-between;padding:3px 0}
      .g{font-weight:bold;border-top:2px solid #111;margin-top:4px;padding-top:6px}
      .m{color:#666;font-size:11px;margin-top:26px} .parties{display:flex;justify-content:space-between;margin-top:20px}
    </style></head><body>
    <h1>${type.toUpperCase()} N° ${esc(numero)}</h1><div style="color:#666">Date : ${esc(date)}</div>
    <div class="parties"><div><b>${esc(me.nom) || 'Votre nom'}</b><br>${nl2br(me.adr)}<br>${me.siret ? 'SIRET : ' + esc(me.siret) + '<br>' : ''}${esc(me.contact)}</div>
    <div style="text-align:right"><b>${esc(client.nom) || 'Client'}</b><br>${nl2br(client.adr)}</div></div>
    <table><tr><th>Description</th><th class="r">Qté</th><th class="r">PU HT</th><th class="r">Total HT</th></tr>${rows}</table>
    <div class="tot"><div><span>Total HT</span><span>${eur(ht)}</span></div>
    ${tva ? `<div><span>TVA ${tva} %</span><span>${eur(montantTva)}</span></div>` : ''}
    <div class="g"><span>${tva ? 'Total TTC' : 'Net à payer'}</span><span>${eur(ttc)}</span></div></div>
    <div class="m">${mentions().map(esc).join('<br>')}</div>
    ${withBrand ? '<div class="m" style="color:#aaa">Créé avec FacturePro</div>' : ''}
    </body></html>`;
  };

  const exportPdf = async () => {
    const pro = await isPro();
    if (!pro && used >= FREE_LIMIT) { setShowPaywall(true); return; }
    try {
      const { uri } = await Print.printToFileAsync({ html: buildHtml(!pro) });
      if (!pro) {
        const n = used + 1;
        setUsed(n);
        await AsyncStorage.setItem(monthKey(), String(n));
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${type} ${numero}` });
      } else {
        Alert.alert('PDF créé', uri);
      }
    } catch (e) {
      Alert.alert('Erreur', "Impossible de créer le PDF.");
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>FacturePro</Text>
        <Text style={s.sub}>Factures et devis en 2 minutes</Text>

        <View style={s.seg}>
          {['Facture', 'Devis'].map((t) => (
            <TouchableOpacity key={t} style={[s.segBtn, type === t && s.segOn]} onPress={() => setType(t)}>
              <Text style={[s.segTxt, type === t && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.row}>
          <Field label="Numéro" value={numero} onChangeText={setNumero} style={{ flex: 1 }} />
          <Field label="Date" value={date} onChangeText={setDate} style={{ flex: 1 }} />
        </View>

        <Text style={s.h2}>Vous</Text>
        <Field label="Nom / raison sociale" value={me.nom} onChangeText={(v) => setMe({ ...me, nom: v })} />
        <Field label="Adresse" value={me.adr} multiline onChangeText={(v) => setMe({ ...me, adr: v })} />
        <Field label="SIRET" value={me.siret} keyboardType="number-pad" onChangeText={(v) => setMe({ ...me, siret: v })} />
        <Field label="Email / téléphone" value={me.contact} onChangeText={(v) => setMe({ ...me, contact: v })} />
        <Field label="IBAN (facultatif)" value={me.iban} autoCapitalize="characters" onChangeText={(v) => setMe({ ...me, iban: v })} />

        <Text style={s.h2}>Votre client</Text>
        <Field label="Nom" value={client.nom} onChangeText={(v) => setClient({ ...client, nom: v })} />
        <Field label="Adresse" value={client.adr} multiline onChangeText={(v) => setClient({ ...client, adr: v })} />

        <Text style={s.h2}>Prestations</Text>
        {lines.map((l, i) => (
          <View key={i} style={s.lineBox}>
            <Field label="Description" value={l.d} onChangeText={(v) => setLine(i, 'd', v)} />
            <View style={s.row}>
              <Field label="Qté" value={l.q} keyboardType="decimal-pad" onChangeText={(v) => setLine(i, 'q', v)} style={{ flex: 1 }} />
              <Field label="Prix unitaire HT (€)" value={l.p} keyboardType="decimal-pad" onChangeText={(v) => setLine(i, 'p', v)} style={{ flex: 2 }} />
              <TouchableOpacity onPress={() => delLine(i)} style={s.del}><Text style={{ fontSize: 22 }}>×</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        <TouchableOpacity style={s.ghost} onPress={addLine}><Text style={s.ghostTxt}>+ Ajouter une ligne</Text></TouchableOpacity>

        <Text style={s.h2}>TVA</Text>
        <View style={s.chips}>
          {TVA_OPTIONS.map((o) => (
            <TouchableOpacity key={o.label} style={[s.chip, tva === o.value && s.chipOn]} onPress={() => setTva(o.value)}>
              <Text style={tva === o.value && { color: '#fff' }}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {type === 'Facture' && (
          <>
            <Text style={s.h2}>Paiement</Text>
            <View style={s.chips}>
              {DELAIS.map((d) => (
                <TouchableOpacity key={d} style={[s.chip, delai === d && s.chipOn]} onPress={() => setDelai(d)}>
                  <Text style={delai === d && { color: '#fff' }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={s.totalBox}>
          <Text>Total HT : {eur(ht)}</Text>
          {tva > 0 && <Text>TVA {tva} % : {eur(montantTva)}</Text>}
          <Text style={s.total}>{tva ? 'Total TTC' : 'Net à payer'} : {eur(ttc)}</Text>
        </View>

        <TouchableOpacity style={s.btn} onPress={exportPdf}><Text style={s.btnTxt}>Créer le PDF et partager</Text></TouchableOpacity>
        <Text style={s.quota}>Documents gratuits ce mois-ci : {Math.min(used, FREE_LIMIT)} / {FREE_LIMIT}</Text>
        <Text style={s.legal}>Outil d'aide à la rédaction : vérifiez vos mentions avec votre comptable ou l'URSSAF.</Text>
      </ScrollView>

      <Modal visible={showPaywall} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modal}>
            <Text style={s.h2}>Limite gratuite atteinte</Text>
            <Text style={{ marginBottom: 16 }}>Vous avez créé vos {FREE_LIMIT} documents gratuits ce mois-ci. Passez en Pro pour un usage illimité, sans mention FacturePro.</Text>
            <TouchableOpacity style={s.btn} onPress={async () => { if (await startSubscription()) setShowPaywall(false); }}><Text style={s.btnTxt}>Passer en Pro – 5 €/mois</Text></TouchableOpacity>
            <TouchableOpacity style={[s.ghost, { marginTop: 10 }]} onPress={async () => { if (await restorePurchases()) setShowPaywall(false); else Alert.alert('Aucun abonnement', "Aucun abonnement actif n'a été trouvé."); }}><Text style={s.ghostTxt}>Restaurer mon achat</Text></TouchableOpacity>
            <TouchableOpacity style={[s.ghost, { marginTop: 10 }]} onPress={() => setShowPaywall(false)}><Text style={s.ghostTxt}>Fermer</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, style, ...props }) {
  return (
    <View style={[{ marginBottom: 10 }, style]}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={[s.input, props.multiline && { height: 64, textAlignVertical: 'top' }]} placeholderTextColor="#aaa" {...props} />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f6f2', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  pad: { padding: 18, paddingBottom: 60 },
  title: { fontSize: 30, fontWeight: '800', color: GREEN },
  sub: { color: '#66706a', marginBottom: 16 },
  h2: { fontSize: 17, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  label: { fontSize: 12, color: '#66706a', marginBottom: 3 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dcd9cf', borderRadius: 8, padding: 10, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  seg: { flexDirection: 'row', borderWidth: 1, borderColor: '#dcd9cf', borderRadius: 10, overflow: 'hidden', marginBottom: 14 },
  segBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  segOn: { backgroundColor: GREEN },
  segTxt: { fontWeight: '600' },
  lineBox: { backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  del: { padding: 10, marginBottom: 10 },
  ghost: { borderWidth: 1, borderColor: GREEN, borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#fff' },
  ghostTxt: { color: GREEN, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#dcd9cf', borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#fff' },
  chipOn: { backgroundColor: GREEN, borderColor: GREEN },
  totalBox: { marginTop: 22, padding: 14, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee', gap: 4 },
  total: { fontWeight: '800', fontSize: 18 },
  btn: { backgroundColor: GREEN, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  quota: { textAlign: 'center', color: '#66706a', marginTop: 10 },
  legal: { textAlign: 'center', color: '#99a', fontSize: 12, marginTop: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 14, padding: 22 },
});
