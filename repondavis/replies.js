// Génération de réponses à partir de modèles (aucune IA, fonctionne hors ligne).
const THEMES = [
  { k: /accueil|sympa|gentil|aimable|souriant|équipe|personnel/i, pos: "l'accueil de l'équipe", neg: "l'accueil reçu" },
  { k: /attente|attendu|long|lent|retard/i, pos: 'notre rapidité', neg: "le temps d'attente" },
  { k: /prix|cher|tarif|coût/i, pos: 'le rapport qualité-prix', neg: 'nos tarifs' },
  { k: /propre|propreté|sale|hygi/i, pos: 'la propreté du lieu', neg: 'la propreté du lieu' },
  { k: /délicieu|bon |excellent|goût|saveur|repas|plat|pain|gâteau|cuisine/i, pos: 'la qualité de nos produits', neg: 'la qualité de nos produits' },
  { k: /conseil|écoute|professionnel|compétent|explic/i, pos: 'nos conseils', neg: 'les conseils reçus' },
  { k: /travail|résultat|réparation|coupe|prestation|service/i, pos: 'la qualité de notre travail', neg: 'la prestation' },
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const theme = (text, positive) => {
  for (const t of THEMES) if (t.k.test(text)) return positive ? t.pos : t.neg;
  return null;
};

// o = { biz, who, sign, text, rating, tone ('chaleureux'|'pro'|'court'), tu (bool), geste, contact }
export function buildReply(o) {
  const { rating, tone, tu } = o;
  const biz = (o.biz || '').trim() || 'notre établissement';
  const hello = o.who && o.who.trim() ? `Bonjour ${o.who.trim()},` : 'Bonjour,';
  const end = o.sign && o.sign.trim() ? `\n\n${o.sign.trim()}\n${biz}` : `\n\nL'équipe de ${biz}`;
  const th = theme(o.text || '', rating >= 4);
  const p = tu ? { poss: 'ton', possF: 'ta' } : { poss: 'votre', possF: 'votre' };

  if (rating >= 4) {
    const thanks = [
      `Merci beaucoup pour ${p.poss} avis et pour ${tu ? 'ta' : 'votre'} note de ${rating} étoiles, cela nous fait vraiment plaisir !`,
      'Un grand merci pour ce retour, il nous touche sincèrement.',
      "Merci d'avoir pris le temps de laisser ce message, c'est très encourageant pour toute l'équipe.",
    ];
    const themeLine = th
      ? `Nous sommes ravis que ${th} ${tu ? "t'" : 'vous '}ait plu.`
      : `Nous sommes ravis que ${tu ? 'tu aies passé' : 'vous ayez passé'} un bon moment chez nous.`;
    const closing = tu
      ? ['On a hâte de te revoir très bientôt !', `À très vite chez ${biz} !`]
      : ['Nous serons heureux de vous accueillir de nouveau très bientôt.', `À très bientôt chez ${biz} !`];
    if (tone === 'court') return `${hello}\n\n${pick(thanks)} ${pick(closing)}${end}`;
    if (tone === 'pro') return `${hello}\n\n${thanks[0]} ${themeLine} ${tu ? 'Ta' : 'Votre'} satisfaction est notre priorité.\n\n${pick(closing)}${end}`;
    return `${hello}\n\n${pick(thanks)} ${themeLine}\n\n${pick(closing)}${end}`;
  }

  const sorry = [
    `Nous sommes sincèrement désolés que ${p.possF} expérience n'ait pas été à la hauteur de ${tu ? 'tes' : 'vos'} attentes.`,
    `Merci d'avoir pris le temps de nous faire part de ${p.poss} ressenti, et toutes nos excuses pour ce désagrément.`,
    `Nous regrettons que ${p.possF} visite ne se soit pas passée comme ${tu ? "tu l'espérais" : "vous l'espériez"}.`,
  ];
  const themeLine = th ? ` Nous prenons en compte ce que ${tu ? 'tu dis' : 'vous dites'} concernant ${th}.` : '';
  const action = `Nous avons partagé ${p.poss} message avec l'équipe afin de nous améliorer.`;
  const geste = o.geste && o.geste.trim() ? ` Pour nous faire pardonner, nous aimerions ${tu ? "t'offrir" : 'vous offrir'} ${o.geste.trim()}.` : '';
  const contact = o.contact && o.contact.trim()
    ? `\n\n${tu ? 'Si tu veux, contacte-nous' : 'Si vous le souhaitez, contactez-nous'} directement au ${o.contact.trim()} pour que nous puissions en discuter.`
    : `\n\n${tu ? "N'hésite pas à nous recontacter" : "N'hésitez pas à nous contacter"} directement pour que nous puissions en discuter.`;
  if (tone === 'court') return `${hello}\n\n${pick(sorry)} ${action}${geste}${contact}${end}`;
  if (tone === 'pro') return `${hello}\n\n${sorry[1]}${themeLine} ${action}${geste}${contact}\n\nNous espérons pouvoir ${tu ? "t'offrir" : 'vous offrir'} une meilleure expérience à l'avenir.${end}`;
  return `${hello}\n\n${pick(sorry)}${themeLine} ${action}${geste}${contact}${end}`;
}
