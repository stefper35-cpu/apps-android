import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, Platform, StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildReply } from './replies';
import { FREE_LIMIT, isPro, startSubscription } from './purchases';

const ACC = '#c2410c';
const TONES = [
  { label: 'Chaleureux', value: 'chaleureux' },
  { label: 'Professionnel', value: 'pro' },
  { label: 'Court', value: 'court' },
];
const monthKey = () => 'ra-used-' + new Date().toISOString().slice(0, 7);

export default function App() {
  const [biz, setBiz] = useState('');
  const [sign, setSign] = useState('');
  const [who, setWho] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [tone, setTone] = useState('chaleureux');
  const [tu, setTu] = useState(false);
  const [geste, setGeste] = useState('');
  const [contact, setContact] = useState('');
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(-1);
  const [used, setUsed] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await AsyncStorage.getItem('ra-profile');
        if (p) { const o = JSON.parse(p); setBiz(o.biz || ''); setSign(o.sign || ''); setContact(o.contact || ''); }
        const u = await AsyncStorage.getItem(monthKey());
        setUsed(parseInt(u, 10) || 0);
      } catch (e) {}
    })();
  }, []);
  useEffect(() => { AsyncStorage.setItem('ra-profile', JSON.stringify({ biz, sign, contact })).catch(() => {}); }, [biz, sign, contact]);

  const generate = async () => {
    if (!text.trim()) return;
    const pro = await isPro();
    if (!pro && used >= FREE_LIMIT) { setShowPaywall(true); return; }
    if (!pro) {
      const n = used + 1;
      setUsed(n);
      AsyncStorage.setItem(monthKey(), String(n)).catch(() => {});
    }
    const seen = new Set();
    for (let i = 0; i < 30 && seen.size < 3; i++) {
      seen.add(buildReply({ biz, who, sign, text, rating, tone, tu, geste, contact }));
    }
    setResults([...seen]);
    setCopied(-1);
  };

  const copy = async (t, i) => {
    await Clipboard.setStringAsync(t);
    setCopied(i);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>RépondAvis</Text>
        <Text style={s.sub}>Répondez à vos avis Google en 10 secondes</Text>

        <Field label="Nom de votre commerce" value={biz} onChangeText={setBiz} />
        <View style={s.row}>
          <Field label="Prénom du client" value={who} onChangeText={setWho} style={{ flex: 1 }} />
          <Field label="Votre prénom" value={sign} onChangeText={setSign} style={{ flex: 1 }} />
        </View>

        <Text style={s.label}>Note laissée</Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((i) => (
            <TouchableOpacity key={i} onPress={() => setRating(i)}>
              <Text style={[s.star, i <= rating && { color: '#f59e0b' }]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field label="Texte de l'avis" value={text} multiline onChangeText={setText} placeholder="Collez ici l'avis du client…" />

        <Text style={s.label}>Ton</Text>
        <View style={s.chips}>
          {TONES.map((t) => (
            <TouchableOpacity key={t.value} style={[s.chip, tone === t.value && s.chipOn]} onPress={() => setTone(t.value)}>
              <Text style={tone === t.value && { color: '#fff' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.chip, tu && s.chipOn]} onPress={() => setTu(!tu)}>
            <Text style={tu && { color: '#fff' }}>Tutoiement</Text>
          </TouchableOpacity>
        </View>

        {rating <= 3 && (
          <View style={{ marginTop: 12 }}>
            <Field label="Geste commercial (facultatif)" value={geste} onChangeText={setGeste} placeholder="ex. un café offert" />
            <Field label="Téléphone ou email à indiquer (facultatif)" value={contact} onChangeText={setContact} />
          </View>
        )}

        <TouchableOpacity style={s.btn} onPress={generate}><Text style={s.btnTxt}>Générer 3 réponses</Text></TouchableOpacity>
        <Text style={s.quota}>Générations gratuites ce mois-ci : {Math.min(used, FREE_LIMIT)} / {FREE_LIMIT}</Text>

        {results.map((r, i) => (
          <View key={i} style={s.card}>
            <Text style={s.cardTitle}>Réponse {i + 1}</Text>
            <Text selectable style={s.out}>{r}</Text>
            <TouchableOpacity style={s.ghost} onPress={() => copy(r, i)}>
              <Text style={s.ghostTxt}>{copied === i ? 'Copié ✓' : 'Copier'}</Text>
            </TouchableOpacity>
          </View>
        ))}
        <Text style={s.legal}>Relisez toujours la réponse avant de la publier.</Text>
      </ScrollView>

      <Modal visible={showPaywall} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modal}>
            <Text style={s.h2}>Limite gratuite atteinte</Text>
            <Text style={{ marginBottom: 16 }}>Vous avez utilisé vos {FREE_LIMIT} générations gratuites ce mois-ci. Passez en Pro pour un usage illimité.</Text>
            <TouchableOpacity style={s.btn} onPress={startSubscription}><Text style={s.btnTxt}>Passer en Pro – 9 €/mois</Text></TouchableOpacity>
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
      <TextInput style={[s.input, props.multiline && { height: 110, textAlignVertical: 'top' }]} placeholderTextColor="#aaa" {...props} />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#faf8f4', paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 },
  pad: { padding: 18, paddingBottom: 60 },
  title: { fontSize: 30, fontWeight: '800', color: ACC },
  sub: { color: '#6f6a60', marginBottom: 16 },
  h2: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 12, color: '#6f6a60', marginBottom: 3 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4dfd3', borderRadius: 8, padding: 10, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
  stars: { flexDirection: 'row', marginBottom: 12 },
  star: { fontSize: 38, color: '#d6d1c4', paddingRight: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e4dfd3', borderRadius: 99, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#fff' },
  chipOn: { backgroundColor: ACC, borderColor: ACC },
  btn: { backgroundColor: ACC, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 18 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  quota: { textAlign: 'center', color: '#6f6a60', marginTop: 10, marginBottom: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#e4dfd3' },
  cardTitle: { fontWeight: '700', marginBottom: 8 },
  out: { backgroundColor: '#fff7ed', borderRadius: 8, padding: 12, marginBottom: 10, lineHeight: 21 },
  ghost: { borderWidth: 1, borderColor: ACC, borderRadius: 10, padding: 11, alignItems: 'center', backgroundColor: '#fff' },
  ghostTxt: { color: ACC, fontWeight: '600' },
  legal: { textAlign: 'center', color: '#99a', fontSize: 12, marginTop: 18 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,.5)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 14, padding: 22 },
});
