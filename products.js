/* ============================================================
   ZAK BOUTIK - Donnees & API
   ============================================================ */

const STORAGE_KEY  = 'casal_products_v6';
const WISHLIST_KEY = 'casal_wishlist_v1';
const REVIEWS_KEY  = 'casal_reviews_v1';
const ORDERS_KEY   = 'casal_orders_v1';
const CART_KEY     = 'casal_cart_v1';
const USER_KEY     = 'casal_user_v1';
const SESSION_KEY  = 'casal_user_session_v1';
const RATING_KEY   = 'casal_site_rating_v1';
const PROMO_USED_KEY = 'casal_promo_used_v1';

/* ============================================================
   CONTACT (à modifier par l'admin)
   ============================================================ */
const CONTACT_INFO = {
  whatsapp: [
    { number: '262639070035', label: '🇾🇹 Mayotte',  display: '+262 639 07 00 35' },
    { number: '33628782826',  label: '📞 Ligne mobile', display: '+33 6 28 78 28 26' }
  ],
  email: 'nassimnissam54@gmail.com',
  shopName: 'ZAK BOUTIK',
  address: {
    street:   '27 rue du Commerce',
    postal:   '97600',
    city:     'Mamoudzou',
    region:   'Mayotte',
    mapsQuery:'27+Rue+du+Commerce+Mamoudzou+97600+Mayotte'
  },
  socials: {
    instagram: 'https://www.instagram.com/zakboutik/',
    facebook:  'https://www.facebook.com/p/Zak-Boutik-100091275030445/',
    tiktok:    ''   // pas de compte TikTok connu : le bouton reste masqué
  }
};

/* ============================================================
   HORAIRES D'OUVERTURE
   Source : profil Instagram @zakboutik.
   Créneaux en heure de MAYOTTE (UTC+3) : c'est l'heure du
   magasin qui compte, pas celle du téléphone du visiteur — un
   client en métropole verrait sinon « ouvert » à 5 h du matin.
   0 = dimanche … 6 = samedi. Tableau vide = fermé ce jour-là.
   ============================================================ */
const STORE_TZ = 'Indian/Mayotte';
const CLOSING_SOON_MIN = 30;          // sous ce délai, pastille orange

const STORE_HOURS = {
  0: [],                                        // dimanche : fermé
  1: [['07:30', '18:00']],                      // lundi
  2: [['07:30', '18:00']],                      // mardi
  3: [['07:30', '18:00']],                      // mercredi
  4: [['07:30', '18:00']],                      // jeudi
  5: [['07:30', '12:30'], ['13:30', '18:00']],  // vendredi : pause 12h30–13h30
  6: [['07:30', '18:00']]                       // samedi
};

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}h${String(min % 60).padStart(2, '0')}`;

/** Jour et minute courants À MAYOTTE, quel que soit le fuseau du visiteur. */
function storeNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: STORE_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(date).map(p => [p.type, p.value])
  );
  // Date reconstruite en UTC à partir des composantes locales de Mayotte :
  // getUTCDay() rend alors le bon jour de la semaine sur place.
  const day = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`).getUTCDay();
  const hour = Number(parts.hour) % 24;         // certains moteurs rendent « 24 » à minuit
  return { day, minutes: hour * 60 + Number(parts.minute) };
}

/**
 * État du magasin maintenant.
 * @returns {{state:'open'|'soon'|'closed', label:string, detail:string}}
 *  open   → vert   · soon → orange (ferme dans moins de 30 min) · closed → rouge
 */
function storeStatus(date = new Date()) {
  const { day, minutes } = storeNow(date);

  for (const [from, to] of (STORE_HOURS[day] || [])) {
    const start = toMinutes(from), end = toMinutes(to);
    if (minutes < start || minutes >= end) continue;
    const left = end - minutes;
    return left <= CLOSING_SOON_MIN
      ? { state: 'soon',  label: 'Ferme bientôt', detail: `Fermeture dans ${left} min (à ${fromMinutes(end)})` }
      : { state: 'open',  label: 'Ouvert',        detail: `Jusqu'à ${fromMinutes(end)}` };
  }

  // Fermé : on cherche la prochaine ouverture, aujourd'hui puis les jours suivants
  const todayNext = (STORE_HOURS[day] || []).find(([from]) => toMinutes(from) > minutes);
  if (todayNext) return { state: 'closed', label: 'Fermé', detail: `Ouvre à ${fromMinutes(toMinutes(todayNext[0]))}` };

  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    const slots = STORE_HOURS[d] || [];
    if (!slots.length) continue;
    const quand = i === 1 ? 'demain' : DAY_NAMES[d].toLowerCase();
    return { state: 'closed', label: 'Fermé', detail: `Ouvre ${quand} à ${fromMinutes(toMinutes(slots[0][0]))}` };
  }
  return { state: 'closed', label: 'Fermé', detail: '' };
}

/** Horaires d'un jour en texte : « 7h30 – 18h00 » ou « 7h30 – 12h30 · 13h30 – 18h00 ». */
function hoursText(day) {
  const slots = STORE_HOURS[day] || [];
  if (!slots.length) return 'Fermé';
  return slots.map(([a, b]) => `${fromMinutes(toMinutes(a))} – ${fromMinutes(toMinutes(b))}`).join(' · ');
}

/* ============================================================
   PAIEMENT
   ⚠️ Ne JAMAIS mettre d'identifiants / mots de passe ici.
   Le lien SumUp suffit : l'argent arrive sur le compte pro
   qui a créé le lien.
   ============================================================ */
const PAYMENT_CONFIG = {
  // Page SumUp "montant libre" du compte pro — GARDÉE EN RÉSERVE
  // mais PAS proposée aux clients (ils ne doivent pas saisir le prix).
  sumupLink: 'https://pay.sumup.com/b2c/Q1R6YHOW',

  // Fonction serveur qui crée un lien SumUp au MONTANT EXACT (API
  // officielle). S'active dès que SUMUP_API_KEY + SUMUP_MERCHANT_CODE
  // sont configurés dans Netlify (voir netlify/functions/).
  // Tant que ce n'est pas configuré : le vendeur envoie le lien du
  // montant exact par WhatsApp (créé depuis son app SumUp).
  checkoutEndpoint: '/.netlify/functions/create-checkout',

  // Modes de paiement proposés au client à la commande.
  // ⏸️ Le paiement par carte EN LIGNE (lien SumUp) est prêt mais désactivé
  // pour l'instant — pour l'activer, décommenter la première entrée.
  methods: [
    // { id:'online-card', icon:'💳', label:'Carte en ligne — SumUp',
    //   desc:'Lien de paiement sécurisé au montant exact de ta commande' },
    { id:'card-onsite', icon:'📟', label:'Carte au retrait',
      desc:'Terminal de paiement à la boutique de Mamoudzou (rue du Commerce), au moment du retrait' },
    { id:'cash', icon:'💵', label:'Espèces au retrait',
      desc:'Tu règles ta commande au magasin en venant la chercher' },
    { id:'transfer', icon:'🏦', label:'Virement bancaire',
      desc:'RIB envoyé par message — commande remise après réception du virement' }
  ]
};

/** Libellé lisible d'un mode de paiement (icône + intitulé).
 *  Couvre aussi les modes désactivés/anciens pour que les commandes
 *  déjà passées restent lisibles dans l'admin et l'espace client. */
function paymentLabel(id) {
  const m = PAYMENT_CONFIG.methods.find(x => x.id === id);
  if (m) return `${m.icon} ${m.label}`;
  return {
    'online-card': '💳 Carte en ligne',
    'card-onsite': '📟 Carte au retrait',
    'cash':        '💵 Espèces au retrait',
    'transfer':    '🏦 Virement bancaire'
  }[id] || '— Non précisé';
}

/** true si la commande se règle au moment du retrait (à encaisser en boutique) */
function isPaidOnPickup(id) { return id === 'card-onsite' || id === 'cash'; }

/* ============================================================
   FICHE PRODUIT — galerie & couleurs
   ============================================================ */

/** Toutes les photos d'un produit : `images` (tableau) si renseigné,
 *  sinon l'image principale seule. Toujours au moins une entrée. */
function productImages(p) {
  const list = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  if (p.imageUrl && !list.includes(p.imageUrl)) list.unshift(p.imageUrl);
  return list.length ? list : [];
}

/** Couleurs disponibles : [{ name, hex }]. Accepte le format admin
 *  "Écru:#e8dcc8, Noir:#111" ou un simple tableau. */
function productColors(p) {
  if (Array.isArray(p.colorOptions)) return p.colorOptions.filter(c => c && c.name);
  if (typeof p.colorOptions === 'string' && p.colorOptions.trim()) {
    return p.colorOptions.split(',').map(s => {
      const [name, hex] = s.split(':').map(x => (x || '').trim());
      return name ? { name, hex: hex || '#cccccc' } : null;
    }).filter(Boolean);
  }
  return [];
}

/** Découpe le champ tailles ("S — M — L") en tableau */
function productSizes(p) {
  const arr = String(p.sizes || '').split(/[—,/]+/).map(s => s.trim()).filter(Boolean);
  return arr.length ? arr : ['Unique'];
}

/* ============================================================
   CODES PROMO
   ============================================================ */
const PROMO_CODES = {
  'BIENVENUE10': { type:'percent', value:10, label:'-10% bienvenue' },
  'BOUTIK15':    { type:'percent', value:15, label:'-15% Zak Boutik' },
  'CLUB20':      { type:'percent', value:20, label:'-20% clubs & assos' }
};

/* ============================================================
   TYPES D'ARTICLES (sous-catégories des onglets Homme/Femme/Garçon/Fille)
   ============================================================ */
const SUB_LABELS = {
  tshirt:     'Tee-shirt',
  chemise:    'Chemise',
  robe:       'Robe',
  pantalon:   'Pantalon & Jean',
  veste:      'Veste',
  ensemble:   'Ensemble',
  short:      'Short',
  basket:     'Chaussures',
  accessoire: 'Accessoire'
};

/* ============================================================
   UNIVERS — les deux parties distinctes de la boutique
   « Homme » regroupe homme + garçon, « Femme » regroupe femme +
   fille.

   Séparation STRICTE : un article appartient à une seule partie,
   jamais aux deux. Un article resté en catégorie « mixte » n'est
   donc affiché dans aucune des deux — il faut lui donner une vraie
   catégorie dans l'admin pour qu'il soit vu par les clients.
   ============================================================ */
const UNIVERSE_KEY = 'zak_universe_v1';

const UNIVERSES = {
  homme: { label: 'Homme',  sub: 'Homme & Garçon', icon: '👔', cats: ['homme', 'garcon'] },
  femme: { label: 'Femme',  sub: 'Femme & Fille',  icon: '👗', cats: ['femme', 'fille'] }
};

/** Catégories d'une partie. Aucune n'est partagée avec l'autre. */
function universeCats(u) {
  return UNIVERSES[u] ? [...UNIVERSES[u].cats] : null;
}

/** Partie d'un produit, ou null s'il n'en a pas (catégorie « mixte »). */
function universeOfCat(cat) {
  return Object.keys(UNIVERSES).find(u => UNIVERSES[u].cats.includes(cat)) || null;
}

/** Articles sans partie : invisibles dès qu'un client en choisit une. */
function productsWithoutUniverse(list) {
  return list.filter(p => !universeOfCat(p.cat));
}

/** true si le produit appartient à l'univers (ou si aucun univers actif). */
function inUniverse(p, u) {
  const cats = universeCats(u);
  return !cats || cats.includes(p.cat);
}

/* ============================================================
   PRODUITS PAR DEFAUT (avec photos Unsplash + stock + textes plus emotionnels)
   ============================================================ */
const NOW = Date.now();
const D = day => NOW - day * 24 * 3600 * 1000;

const DEFAULT_PRODUCTS = [
  /* ===== SÉLECTION INSTAGRAM @zakboutik — photos boutique ===== */
  { id:101, type:'vetement', sub:'ensemble', cat:'homme', name:'Ensemble Lin Écru Manches Courtes',
    price:69.99, oldPrice:null, badge:'Nouveau',
    desc:"Le lin qui respire quand Mamoudzou écrase de chaleur. Chemise col ouvert, pantalon fluide assorti : tu l'enfiles le matin, tu le portes jusqu'au bout de la nuit sans jamais avoir chaud. C'est la tenue qui fait dire « il a de l'allure » sans que tu aies eu à essayer.",
    material:'55% Lin · 45% Coton · Coupe décontractée',
    sizes:'S — M — L — XL — XXL',
    icon:'👔', stock:'in', status:'live',
    imageUrl:'img/produits/ig-2.jpg',
    colorOptions:[{name:'Écru',hex:'#e8dcc8'},{name:'Beige sable',hex:'#cbb894'},{name:'Noir',hex:'#1a1a1a'}],
    color1:'#e8dcc8', color2:'#c9b79a', createdAt: D(1), rating:4.9 },

  { id:102, type:'vetement', sub:'ensemble', cat:'homme', name:'Ensemble Denim Délavé Gris',
    price:79.99, oldPrice:94.99, badge:'-16%',
    desc:"Le denim gris qui casse les codes. Chemise boxy manches courtes, pantalon large qui tombe pile : la pièce que personne d'autre n'aura sur la place. Tu descends en ville avec, et tu sens les regards qui suivent.",
    material:'100% Coton denim délavé acid wash',
    sizes:'S — M — L — XL — XXL',
    icon:'🧥', stock:'in', status:'live',
    imageUrl:'img/produits/ig-4.jpg',
    colorOptions:[{name:'Gris délavé',hex:'#8e8e93'},{name:'Bleu brut',hex:'#3b5a80'}],
    color1:'#8e8e93', color2:'#5a5a5f', createdAt: D(2), rating:4.8 },

  { id:103, type:'vetement', sub:'tshirt', cat:'homme', name:'Tee-shirt Oversize Playa Luquillo',
    price:29.99, oldPrice:null, badge:'',
    desc:"Un coucher de soleil sur les Caraïbes imprimé dans ton dos. Coton lourd, coupe oversize aux épaules tombantes — celui que tu attrapes en premier quand il fait 32°, et qui raconte l'évasion même quand tu es coincé au bureau.",
    material:'100% Coton lourd 240 g · Coupe oversize',
    sizes:'S — M — L — XL — XXL',
    icon:'🌴', stock:'in', status:'live',
    imageUrl:'img/produits/ig-5.jpg',
    colorOptions:[{name:'Écru',hex:'#f4efe4'},{name:'Noir',hex:'#1a1a1a'},{name:'Vert sauge',hex:'#8fa88a'}],
    color1:'#f4efe4', color2:'#2a8c82', createdAt: D(3), rating:4.9 },

  { id:104, type:'vetement', sub:'tshirt', cat:'homme', name:'Débardeur Crochet Bohème',
    price:34.99, oldPrice:null, badge:'Édition limitée',
    desc:"Le crochet fait main qui laisse passer l'air et la lumière. Rayures terracotta, safran et crème : impossible de passer inaperçu sur le front de mer. C'est la pièce qu'on te demandera où tu l'as trouvée, à chaque fois.",
    material:'Crochet coton tricoté · Fait main',
    sizes:'S — M — L — XL',
    icon:'🧶', stock:'low', status:'live',
    imageUrl:'img/produits/ig-1.jpg',
    colorOptions:[{name:'Terracotta',hex:'#8b5e34'},{name:'Crème',hex:'#e9dcc3'}],
    color1:'#e9dcc3', color2:'#8b5e34', createdAt: D(0), rating:5.0 },

  { id:105, type:'vetement', sub:'tshirt', cat:'homme', name:'Maillot Jersey 91 Vert',
    price:34.99, oldPrice:null, badge:'',
    desc:"Le maillot football américain qui transforme un jean simple en tenue complète. Mesh respirant, chiffres verts flashy, coupe large aux épaules : l'énergie du terrain, portée en ville. Pour ceux qui aiment qu'on les remarque de loin.",
    material:'Mesh polyester respirant · Coupe oversize',
    sizes:'S — M — L — XL — XXL',
    icon:'🏈', stock:'in', status:'live',
    imageUrl:'img/produits/ig-9.jpg',
    colorOptions:[{name:'Blanc / Vert',hex:'#7ed321'},{name:'Noir / Rouge',hex:'#c0392b'}],
    color1:'#ffffff', color2:'#7ed321', createdAt: D(4), rating:4.7 },

  { id:106, type:'vetement', sub:'ensemble', cat:'homme', name:'Ensemble Project X Paris Bleu Ciel',
    price:59.99, oldPrice:null, badge:'Nouveau',
    desc:"Le bleu du lagon un matin de saison sèche. Maillot et short assortis, tissu léger qui sèche en un rien de temps — de la salle au terrain, du terrain à la terrasse. Project X Paris, la marque qui a compris ce que veut la jeunesse d'ici.",
    material:'100% Polyester technique · Séchage rapide',
    sizes:'S — M — L — XL — XXL',
    icon:'💧', stock:'in', status:'live',
    imageUrl:'img/produits/ig-6.jpg',
    colorOptions:[{name:'Bleu ciel',hex:'#a8d8ea'},{name:'Noir',hex:'#1a1a1a'},{name:'Bordeaux',hex:'#7b2d3b'}],
    color1:'#a8d8ea', color2:'#1a1a1a', createdAt: D(5), rating:4.8 },

  { id:107, type:'vetement', sub:'veste', cat:'homme', name:'Costume 2 Pièces Camel',
    price:149.99, oldPrice:179.99, badge:'-17%',
    desc:"Le costume des jours qui comptent. Camel profond, épaules nettes, tombé impeccable — mariage, entretien, grande occasion : tu entres dans la pièce et on te prend au sérieux avant même que tu parles. Un investissement qui te suivra des années.",
    material:'Laine mélangée · Doublure satinée · Veste + pantalon',
    sizes:'46 — 48 — 50 — 52 — 54',
    icon:'🤵', stock:'low', status:'live',
    imageUrl:'img/produits/ig-7.jpg',
    colorOptions:[{name:'Camel',hex:'#c19a6b'},{name:'Bleu nuit',hex:'#1f2a44'},{name:'Anthracite',hex:'#3a3a3a'}],
    color1:'#c19a6b', color2:'#8b6f47', createdAt: D(7), rating:4.9 },

  { id:108, type:'vetement', sub:'accessoire', sport:'lunettes', cat:'mixte', name:'Lunettes Monture Dorée Bleu Marbré',
    price:49.99, oldPrice:null, badge:'',
    desc:"Monture dorée fine, branches bleu marbré : le détail qui change un visage. Elles attrapent la lumière quand tu tournes la tête, et donnent à n'importe quelle tenue ce supplément d'élégance qu'on ne peut pas acheter ailleurs à Mamoudzou.",
    material:'Métal doré · Branches acétate marbré · Verres UV400',
    sizes:'Taille unique',
    icon:'🕶️', stock:'in', status:'live',
    imageUrl:'img/produits/ig-3.jpg',
    colorOptions:[{name:'Doré / Bleu',hex:'#2b6cb0'},{name:'Doré / Écaille',hex:'#7a4a21'}],
    color1:'#d4af37', color2:'#2b6cb0', createdAt: D(6), rating:4.8 },

  { id:109, type:'vetement', sub:'accessoire', sport:'bijou', cat:'mixte', name:'Chevalière Dorée Soleil',
    price:39.99, oldPrice:null, badge:'',
    desc:"Une chevalière massive au motif soleil rayonnant, qui accroche la lumière à chaque geste. Elle ne crie pas, elle affirme. Le genre de bijou qu'on ne retire plus, et qui devient une signature — la tienne.",
    material:'Acier inoxydable doré à l\'or fin · Anti-allergie',
    sizes:'56 — 58 — 60 — 62 — 64',
    icon:'💍', stock:'in', status:'live',
    imageUrl:'img/produits/ig-8.jpg',
    colorOptions:[{name:'Doré',hex:'#d4af37'},{name:'Argenté',hex:'#c0c0c0'}],
    color1:'#d4af37', color2:'#9a7b2f', createdAt: D(8), rating:4.9 },

  { id:110, type:'vetement', sub:'accessoire', sport:'bijou', cat:'mixte', name:'Montre Acier Bicolore Cadran Turquoise',
    price:89.99, oldPrice:109.99, badge:'-18%',
    desc:"Un cadran turquoise comme le lagon à midi, serti dans un bracelet acier et or. Tu la regardes pour l'heure, mais c'est elle qu'on regarde à ton poignet. La pièce qui termine une tenue et qui traverse les saisons sans jamais dater.",
    material:'Acier inoxydable bicolore · Verre minéral · Étanche 3 ATM',
    sizes:'Bracelet ajustable',
    icon:'⌚', stock:'low', status:'live',
    imageUrl:'img/produits/ig-10.jpg',
    colorOptions:[{name:'Turquoise / Or',hex:'#40c4c4'},{name:'Noir / Acier',hex:'#2f3640'}],
    color1:'#40c4c4', color2:'#d4af37', createdAt: D(9), rating:5.0 },

  /* ===== ARRIVAGE BASKETS HOMME — publication Instagram du 30 mars =====
     Photos officielles des marques, transmises par le fournisseur.
     Prix indicatifs alignés sur le marché : à ajuster dans l'admin
     selon les tarifs réellement pratiqués en boutique. */
  { id:120, type:'basket', sub:'basket', cat:'homme', name:'Nike P-6000 Noir Intégral',
    price:119.99, oldPrice:null, badge:'Nouveau',
    desc:"Le noir sur noir, du lacet à la semelle. Cette silhouette running des années 2000 revient sans un gramme de nostalgie de trop : tu la mets avec tout, elle ne jure avec rien. Celle que tu enfiles quand tu n'as pas envie de réfléchir à ta tenue, et qui te fait quand même remarquer.",
    material:'Mesh respirant · Empiècements cuir synthétique · Semelle caoutchouc',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', qty:6, status:'live',
    imageUrl:'img/produits/ig-h1.jpg',
    colorOptions:[{name:'Noir intégral',hex:'#111111'}],
    color1:'#1a1a1a', color2:'#3a3a3a', createdAt: D(0), rating:4.9 },

  { id:121, type:'basket', sub:'basket', cat:'homme', name:'Nike P-6000 Rouge & Argent',
    price:124.99, oldPrice:null, badge:'Nouveau',
    desc:"Le rouge qui ne demande la permission à personne. Panneaux argent métallisé, mesh écarlate, semelle blanche : c'est la paire qui attrape la lumière du parking avant même que tu sois descendu de voiture. À porter avec du sobre — elle parle déjà assez fort.",
    material:'Mesh · Empiècements métallisés · Semelle caoutchouc',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', qty:5, status:'live',
    imageUrl:'img/produits/ig-h2.jpg',
    colorOptions:[{name:'Rouge / Argent',hex:'#c8102e'}],
    color1:'#c8102e', color2:'#c0c0c0', createdAt: D(0), rating:4.8 },

  { id:113, type:'basket', sub:'basket', cat:'homme', name:'Nike P-6000 Camel Daim',
    price:124.99, oldPrice:null, badge:'',
    desc:"Un camel chaud, du daim mat et du cuir brillant sur la même chaussure. C'est la version douce de la P-6000 : celle qui va avec un jean brut, un pantalon lin, un short — bref, avec ta semaine entière. La couleur qui ne se démode pas et qui vieillit bien.",
    material:'Daim · Mesh · Empiècements cuir synthétique',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', qty:4, status:'live',
    imageUrl:'img/produits/ig-h3.jpg',
    colorOptions:[{name:'Camel',hex:'#c8873f'}],
    color1:'#c8873f', color2:'#8a5a28', createdAt: D(0), rating:4.7 },

  { id:114, type:'basket', sub:'basket', cat:'homme', name:'Nike Air Max Dn Noir & Orange',
    price:169.99, oldPrice:189.99, badge:'-11%',
    desc:"Quatre bulles d'air alignées sous le talon, orange métal sur noir. Tu la sens dès le premier pas : ça rebondit. C'est la paire des longues journées debout — et celle qu'on repère de loin dans la rue du Commerce.",
    material:'Mesh technique · Renforts thermoscellés · Unité Air Dn',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', qty:4, status:'live',
    imageUrl:'img/produits/ig-h4.jpg',
    colorOptions:[{name:'Noir / Orange',hex:'#e8541f'}],
    color1:'#1a1a1a', color2:'#e8541f', createdAt: D(0), rating:4.9 },

  { id:115, type:'basket', sub:'basket', cat:'homme', name:'Nike Air Max Blanc Intégral',
    price:159.99, oldPrice:null, badge:'Nouveau',
    desc:"Blanc partout, sans une couture qui dépasse. Les lignes ondulées se lisent à peine, juste le relief sous la lumière. C'est la paire qui rend n'importe quelle tenue plus propre — celle qu'on garde pour les jours où on veut être bien mis sans en faire trop.",
    material:'Mesh · Overlays synthétiques · Unité Air visible',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', qty:5, status:'live',
    imageUrl:'img/produits/ig-h5.jpg',
    colorOptions:[{name:'Blanc',hex:'#f5f5f5'}],
    color1:'#ffffff', color2:'#d8d8d8', createdAt: D(0), rating:4.8 },

  { id:116, type:'basket', sub:'basket', cat:'homme', name:'Nike Shox TL Gris',
    price:189.99, oldPrice:null, badge:'',
    desc:"Les colonnes Shox sous le pied, celles qu'on reconnaît sans lire le logo. Gris sur gris, du mesh et des nervures : un vrai morceau des années 2000, remis droit dans le présent. Celle qui fait tourner les têtes de ceux qui savent.",
    material:'Mesh · Overlays synthétiques · Colonnes Shox',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', qty:3, status:'live',
    imageUrl:'img/produits/ig-h6.jpg',
    colorOptions:[{name:'Gris',hex:'#a9adb1'}],
    color1:'#a9adb1', color2:'#6b7075', createdAt: D(0), rating:4.9 },

  { id:117, type:'basket', sub:'basket', cat:'homme', name:'New Balance 1000 Irisé',
    price:154.99, oldPrice:null, badge:'Rare',
    desc:"Violet, vert, argent : la couleur change selon l'angle et selon l'heure. Personne d'autre n'aura la même dans la rue, et c'est exactement le but. Le N cobalt sur le côté termine le travail. Une pièce qui se remarque sans un mot.",
    material:'Synthétique irisé · Mesh · Semelle caoutchouc',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', qty:3, status:'live',
    imageUrl:'img/produits/ig-h7.jpg',
    colorOptions:[{name:'Irisé violet / vert',hex:'#8f7fb8'}],
    color1:'#8f7fb8', color2:'#5f8f7f', createdAt: D(0), rating:4.8 },

  { id:118, type:'basket', sub:'basket', cat:'homme', name:'New Balance 1906R Doré & Marron',
    price:179.99, oldPrice:null, badge:'Nouveau',
    desc:"Doré sur marron, avec le maillage discret qu'on ne voit qu'en s'approchant. C'est la paire qui se remarque de près plutôt que de loin — celle des gens qui choisissent leurs chaussures avant leur tenue. Confort de course, allure de ville.",
    material:'Mesh technique · Empiècements métallisés · Amorti N-ergy',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', qty:4, status:'live',
    imageUrl:'img/produits/ig-h8.jpg',
    colorOptions:[{name:'Doré / Marron',hex:'#b8935a'}],
    color1:'#b8935a', color2:'#4a3a28', createdAt: D(0), rating:5.0 },

  { id:119, type:'basket', sub:'basket', cat:'homme', name:'New Balance 530 Noir & Blanc',
    price:114.99, oldPrice:null, badge:'',
    desc:"La valeur sûre du lot. Noir, gris, une semelle blanche bien franche : elle va avec le jean du lundi comme avec l'ensemble du samedi soir. Si tu n'en prends qu'une, prends celle-là — c'est celle que tu porteras le plus.",
    material:'Mesh · Daim · Semelle ABZORB',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', qty:8, status:'live',
    imageUrl:'img/produits/ig-h9.jpg',
    colorOptions:[{name:'Noir / Blanc',hex:'#2a2a2a'}],
    color1:'#2a2a2a', color2:'#e8e8e8', createdAt: D(0), rating:4.9 },

  { id:122, type:'vetement', sub:'tshirt', cat:'homme', name:'Maillot Mesh 77 Blanc',
    price:39.99, oldPrice:null, badge:'Nouveau',
    desc:"Tu l'enfiles par-dessus un tee-shirt blanc, tu descends en ville, et la soirée prend un autre tour. Le mesh laisse filer l'air quand Mamoudzou étouffe : tu restes frais pendant que les autres cherchent l'ombre. Le 77 en bordeaux, c'est le détail dont on te reparle le lendemain. Ce maillot ne demande rien à personne — il annonce simplement que tu es arrivé.",
    material:'Maille filet ajourée · Coupe oversize · Col V bordé',
    sizes:'S — M — L — XL — XXL',
    icon:'👕', qty:7, status:'live',
    imageUrl:'img/produits/ig-n1.jpg',
    colorOptions:[{name:'Blanc / Bordeaux',hex:'#f2f2f2'}],
    color1:'#f5f5f5', color2:'#8c2f39', createdAt: D(0), rating:4.9 },

  { id:123, type:'vetement', sub:'ensemble', cat:'homme', name:'Ensemble Polo Zippé Noir Col Blanc',
    price:74.99, oldPrice:null, badge:'Nouveau',
    desc:"Le noir qui pose, et le col blanc qui tranche. Dans cet ensemble tu bouges peu — tu n'en as pas besoin. La coupe large tombe toute seule, le zip s'ouvre juste ce qu'il faut, la broderie ne se lit que si on s'approche. C'est la tenue des soirées où tu n'as rien à prouver à personne : elle parle avant toi, et elle parle bas.",
    material:'Maille douce · Col et poignets contrastés · Zip quart · Pantalon ample assorti',
    sizes:'S — M — L — XL — XXL',
    icon:'👔', qty:6, status:'live',
    imageUrl:'img/produits/ig-n2.jpg',
    colorOptions:[{name:'Noir / Blanc',hex:'#1a1a1a'}],
    color1:'#1a1a1a', color2:'#f0f0f0', createdAt: D(0), rating:5.0 },

  /* ===================== FEMME ===================== */
  { id:1, type:'vetement', sub:'robe', cat:'femme', name:'Robe Midi Fleurie',
    price:39.99, oldPrice:null, badge:'',
    desc:"Légère comme une brise de l'océan Indien. Imprimé fleuri romantique, coupe midi flatteuse — de la plage aux soirées de Mamoudzou.",
    material:'100% Viscose douce · Doublure coton',
    sizes:'XS — S — M — L — XL',
    icon:'👗', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80',
    color1:'#fd79a8', color2:'#e84393', createdAt: D(1), rating:4.9 },

  { id:2, type:'vetement', sub:'tshirt', cat:'femme', name:'Tee-shirt Basique Femme',
    price:12.99, oldPrice:null, badge:'',
    desc:"Le basique parfait, coupe ajustée et coton tout doux. Existe en plusieurs coloris — la base de toutes tes tenues.",
    material:'100% Coton peigné',
    sizes:'XS — S — M — L — XL',
    icon:'👚', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
    color1:'#fd79a8', color2:'#ffeaa7', createdAt: D(5), rating:4.7 },

  { id:3, type:'vetement', sub:'pantalon', cat:'femme', name:'Jean Taille Haute Femme',
    price:34.99, oldPrice:null, badge:'',
    desc:"La coupe qui allonge la silhouette. Denim stretch confortable, taille haute gainante — s'accorde avec tout.",
    material:'98% Coton · 2% Élasthanne',
    sizes:'34 — 36 — 38 — 40 — 42 — 44',
    icon:'👖', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80',
    color1:'#0984e3', color2:'#2d3436', createdAt: D(3), rating:4.8 },

  { id:4, type:'vetement', sub:'veste', cat:'femme', name:'Blazer Élégance Femme',
    price:44.99, oldPrice:54.99, badge:'-18%',
    desc:"L'allié chic de ton dressing. Coupe structurée, tombé impeccable — du bureau au dîner sans se changer.",
    material:'Polyester premium · Doublure satinée',
    sizes:'XS — S — M — L — XL',
    icon:'🧥', stock:'in', status:'live', imageUrl:'',
    color1:'#6c5ce7', color2:'#a29bfe', createdAt: D(8), rating:4.6 },

  { id:5, type:'vetement', sub:'ensemble', cat:'femme', name:'Ensemble Été Femme',
    price:29.99, oldPrice:null, badge:'',
    desc:"Top + jupe assortis, tissu fluide et frais. L'ensemble coordonné qui fait l'effet d'une tenue pensée au détail près.",
    material:'Viscose légère',
    sizes:'S — M — L — XL',
    icon:'👛', stock:'in', status:'live', imageUrl:'',
    color1:'#e84393', color2:'#fdcb6e', createdAt: D(6), rating:4.7 },

  { id:6, type:'basket', sub:'basket', cat:'femme', name:'Baskets Blanches Femme',
    price:49.99, oldPrice:null, badge:'',
    desc:"Les blanches indémodables qui vont avec tout. Cuir synthétique facile d'entretien, semelle confort au quotidien.",
    material:'Cuir synthétique · Semelle caoutchouc',
    sizes:'36 — 37 — 38 — 39 — 40 — 41',
    icon:'👟', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80',
    color1:'#dfe6e9', color2:'#b2bec3', createdAt: D(2), rating:4.9 },

  { id:7, type:'basket', sub:'basket', cat:'femme', name:'Sandales Dorées Femme',
    price:24.99, oldPrice:null, badge:'',
    desc:"L'éclat doré aux pieds. Brides fines, semelle confortable — parfaites pour les mariages, soirées et balades du front de mer.",
    material:'Simili cuir doré · Semelle antidérapante',
    sizes:'36 — 37 — 38 — 39 — 40 — 41',
    icon:'👡', stock:'in', status:'live', imageUrl:'',
    color1:'#fdcb6e', color2:'#e17055', createdAt: D(9), rating:4.6 },

  /* ===================== HOMME ===================== */
  { id:8, type:'vetement', sub:'tshirt', cat:'homme', name:'Tee-shirt Coton Homme',
    price:12.99, oldPrice:null, badge:'',
    desc:"Coton épais de qualité, coupe droite moderne. Le tee-shirt qu'on rachète en trois couleurs tellement il tombe bien.",
    material:'100% Coton peigné 180 g',
    sizes:'S — M — L — XL — XXL',
    icon:'👕', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80',
    color1:'#2d3436', color2:'#636e72', createdAt: D(4), rating:4.7 },

  { id:9, type:'vetement', sub:'chemise', cat:'homme', name:'Chemise Lin Homme',
    price:29.99, oldPrice:null, badge:'',
    desc:"Le lin qui respire sous le climat de Mayotte. Coupe décontractée-chic, idéale bureau, mariage ou vendredi soir.",
    material:'55% Lin · 45% Coton',
    sizes:'S — M — L — XL — XXL',
    icon:'👔', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80',
    color1:'#dfe6e9', color2:'#74b9ff', createdAt: D(2), rating:4.8 },

  { id:10, type:'vetement', sub:'pantalon', cat:'homme', name:'Jean Slim Homme',
    price:34.99, oldPrice:null, badge:'',
    desc:"Le jean qu'on enfile les yeux fermés. Coupe slim moderne, stretch confortable toute la journée, denim brut élégant.",
    material:'98% Coton · 2% Élasthanne',
    sizes:'38 — 40 — 42 — 44 — 46',
    icon:'👖', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
    color1:'#2d3436', color2:'#636e72', createdAt: D(7), rating:4.6 },

  { id:11, type:'vetement', sub:'veste', cat:'homme', name:'Veste Bomber Homme',
    price:49.99, oldPrice:null, badge:'',
    desc:"La pièce signature du streetwear. Coupe moderne, col montant, finitions soignées — le détail qui change une tenue.",
    material:'Nylon ripstop · Doublure satinée',
    sizes:'S — M — L — XL — XXL',
    icon:'🧥', stock:'low', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',
    color1:'#1a1a2e', color2:'#16213e', createdAt: D(1), rating:4.9 },

  { id:12, type:'vetement', sub:'short', cat:'homme', name:'Short Chino Homme',
    price:22.99, oldPrice:null, badge:'',
    desc:"Le short habillé-décontracté des journées chaudes. Toile de coton souple, coupe nette au-dessus du genou.",
    material:'97% Coton · 3% Élasthanne',
    sizes:'38 — 40 — 42 — 44 — 46',
    icon:'🩳', stock:'in', status:'live', imageUrl:'',
    color1:'#e8d8c3', color2:'#b2bec3', createdAt: D(11), rating:4.5 },

  { id:13, type:'basket', sub:'basket', cat:'homme', name:'Baskets Urbaines Homme',
    price:54.99, oldPrice:null, badge:'',
    desc:"Le style et le confort au quotidien. Design urbain, semelle amortie, matières résistantes — elles encaissent tout.",
    material:'Cuir synthétique · Mesh · Semelle EVA',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    color1:'#d63031', color2:'#e17055', createdAt: D(3), rating:4.8 },

  { id:14, type:'basket', sub:'basket', cat:'homme', name:'Mocassins Cuir Homme',
    price:59.99, oldPrice:69.99, badge:'-14%',
    desc:"L'élégance sans effort. Cuir souple, semelle confort, finition soignée — pour le bureau et les grandes occasions.",
    material:'Cuir véritable · Semelle gomme',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'🥿', stock:'in', status:'live', imageUrl:'',
    color1:'#6d4c2f', color2:'#2d3436', createdAt: D(13), rating:4.6 },

  /* ===================== GARÇON ===================== */
  { id:15, type:'vetement', sub:'tshirt', cat:'garcon', name:'Tee-shirt Garçon',
    price:9.99, oldPrice:null, badge:'',
    desc:"Doux, résistant aux récrés et aux lavages. Couleurs vives qui tiennent — le basique préféré des mamans.",
    material:'100% Coton',
    sizes:'4A — 6A — 8A — 10A — 12A — 14A',
    icon:'👕', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&q=80',
    color1:'#0984e3', color2:'#74b9ff', createdAt: D(5), rating:4.8 },

  { id:16, type:'vetement', sub:'ensemble', cat:'garcon', name:'Ensemble Garçon 2 Pièces',
    price:19.99, oldPrice:null, badge:'',
    desc:"Tee-shirt + short assortis : la tenue complète en un seul geste. Confortable pour jouer, jolie pour sortir.",
    material:'Coton et polyester doux',
    sizes:'4A — 6A — 8A — 10A — 12A',
    icon:'🧒', stock:'in', status:'live', imageUrl:'',
    color1:'#00b894', color2:'#0984e3', createdAt: D(8), rating:4.7 },

  { id:17, type:'vetement', sub:'short', cat:'garcon', name:'Short Cargo Garçon',
    price:12.99, oldPrice:null, badge:'',
    desc:"Des poches partout pour ses trésors. Toile solide, taille élastique — le short de toutes les aventures.",
    material:'100% Coton toile',
    sizes:'4A — 6A — 8A — 10A — 12A — 14A',
    icon:'🩳', stock:'in', status:'live', imageUrl:'',
    color1:'#6d4c2f', color2:'#b2bec3', createdAt: D(12), rating:4.5 },

  { id:18, type:'basket', sub:'basket', cat:'garcon', name:'Baskets Garçon Scratch',
    price:29.99, oldPrice:null, badge:'',
    desc:"Scratch facile à enfiler seul, semelle qui amortit les sprints de récré. Renfort pointe pour durer toute l'année.",
    material:'Mesh + synthétique · Semelle EVA',
    sizes:'28 — 30 — 32 — 34 — 36 — 38',
    icon:'⚡', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80',
    color1:'#0984e3', color2:'#00b894', createdAt: D(4), rating:4.8 },

  /* ===================== FILLE ===================== */
  { id:19, type:'vetement', sub:'robe', cat:'fille', name:'Robe Volants Fille',
    price:16.99, oldPrice:null, badge:'',
    desc:"La robe qui tourne ! Volants légers, matière douce, couleurs joyeuses — pour l'école comme pour les fêtes.",
    material:'Coton et voile léger',
    sizes:'4A — 6A — 8A — 10A — 12A',
    icon:'👗', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80',
    color1:'#e84393', color2:'#fd79a8', createdAt: D(2), rating:4.9 },

  { id:20, type:'vetement', sub:'ensemble', cat:'fille', name:'Ensemble Fille 2 Pièces',
    price:19.99, oldPrice:null, badge:'',
    desc:"Top + legging assortis, doux et extensibles. La tenue coordonnée pour bouger, danser et être la plus stylée.",
    material:'Coton stretch',
    sizes:'4A — 6A — 8A — 10A — 12A',
    icon:'🎀', stock:'in', status:'live', imageUrl:'',
    color1:'#fd79a8', color2:'#a29bfe', createdAt: D(7), rating:4.7 },

  { id:21, type:'basket', sub:'basket', cat:'fille', name:'Baskets Paillettes Fille',
    price:29.99, oldPrice:null, badge:'',
    desc:"Des paillettes qui captent la lumière à chaque pas. Semelle souple, scratch facile — confort et magie réunis.",
    material:'Simili irisé · Semelle EVA souple',
    sizes:'24 — 26 — 28 — 30 — 32 — 34',
    icon:'✨', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=600&q=80',
    color1:'#ff7675', color2:'#fd79a8', createdAt: D(3), rating:4.8 },

  { id:22, type:'basket', sub:'basket', cat:'fille', name:'Ballerines Pastel Fille',
    price:24.99, oldPrice:null, badge:'',
    desc:"L'arc-en-ciel aux pieds. Coloris pastel tout doux, faciles à enfiler — pour des journées légères et colorées.",
    material:'Canvas coton · Semelle caoutchouc',
    sizes:'24 — 26 — 28 — 30 — 32 — 34',
    icon:'🩰', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1581784368651-8916092072cf?w=600&q=80',
    color1:'#a29bfe', color2:'#fd79a8', createdAt: D(10), rating:4.6 },

  /* ============ ACCESSOIRES (mixte — regroupés par type) ============ */
  { id:23, type:'vetement', sub:'accessoire', sport:'sac', cat:'mixte', name:'Sac à Main Tressé',
    price:34.99, oldPrice:null, badge:'',
    desc:"Le tressé tendance qui habille toutes les tenues. Format pratique, anses confortables, doublure avec poche zippée.",
    material:'Simili cuir tressé · Doublure tissu',
    sizes:'Taille unique',
    icon:'👜', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80',
    color1:'#e17055', color2:'#fdcb6e', createdAt: D(2), rating:4.8 },

  { id:24, type:'vetement', sub:'accessoire', sport:'sac', cat:'mixte', name:'Sac à Dos Urbain',
    price:29.99, oldPrice:null, badge:'',
    desc:"École, boulot, week-end : il suit partout. Compartiment ordinateur, poches multiples, tissu déperlant.",
    material:'Polyester 600D déperlant',
    sizes:'20 L',
    icon:'🎒', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    color1:'#2d3436', color2:'#0984e3', createdAt: D(6), rating:4.7 },

  { id:25, type:'vetement', sub:'accessoire', sport:'casquette', cat:'mixte', name:'Casquette Brodée',
    price:12.99, oldPrice:null, badge:'',
    desc:"La touche finale de la tenue. Coton twill, broderie soignée, réglage à l'arrière — pour elle et lui.",
    material:'Coton twill · Réglage scratch',
    sizes:'Taille unique — réglable',
    icon:'🧢', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80',
    color1:'#2d3436', color2:'#636e72', createdAt: D(4), rating:4.6 },

  { id:26, type:'vetement', sub:'accessoire', sport:'ceinture', cat:'mixte', name:'Ceinture Cuir',
    price:17.99, oldPrice:null, badge:'',
    desc:"Le détail qui structure la tenue. Cuir véritable, boucle métal brossé — s'ajuste au millimètre.",
    material:'Cuir véritable · Boucle métal',
    sizes:'85 — 95 — 105 — 115 cm',
    icon:'🪢', stock:'in', status:'live', imageUrl:'',
    color1:'#6d4c2f', color2:'#2d3436', createdAt: D(9), rating:4.5 },

  { id:27, type:'vetement', sub:'accessoire', sport:'lunettes', cat:'mixte', name:'Lunettes de Soleil',
    price:19.99, oldPrice:null, badge:'',
    desc:"Protection UV400 et style assuré. Monture légère, verres teintés — indispensables sous le soleil de Mayotte.",
    material:'Monture acétate · Verres UV400',
    sizes:'Taille unique',
    icon:'🕶️', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80',
    color1:'#2d3436', color2:'#fdcb6e', createdAt: D(1), rating:4.7 },

  { id:28, type:'vetement', sub:'accessoire', sport:'bijou', cat:'mixte', name:'Créoles Dorées',
    price:14.99, oldPrice:null, badge:'',
    desc:"Les créoles intemporelles qui illuminent le visage. Finition dorée sans nickel, fermoir sécurisé.",
    material:'Alliage doré sans nickel',
    sizes:'4 cm',
    icon:'💛', stock:'in', status:'live', imageUrl:'',
    color1:'#fdcb6e', color2:'#e17055', createdAt: D(5), rating:4.6 }
];

/* ============================================================
   API PRODUITS
   ============================================================ */
/* ============================================================
   STOCK NUMÉRIQUE
   `qty` est la source de vérité : le nombre de pièces réellement
   disponibles. Il se décrémente tout seul à chaque commande (côté
   serveur, dans /api/orders) et se recrédite si la commande est
   annulée. Le champ `stock` ('in'|'low'|'out') qu'affichent les
   fiches produit en est simplement déduit — rien à saisir deux fois.
   ============================================================ */
const LOW_STOCK = 3;   // en dessous, on prévient « plus que quelques pièces »

/** Repli pour les produits d'avant le stock numérique. */
const QTY_FROM_STATUS = { in: 10, low: LOW_STOCK, out: 0 };

/** Quantité disponible d'un produit, migration comprise. */
function qtyOf(p) {
  if (p && Number.isFinite(Number(p.qty))) return Math.max(0, Math.floor(Number(p.qty)));
  return QTY_FROM_STATUS[p?.stock] ?? QTY_FROM_STATUS.in;
}

/** Statut d'affichage déduit de la quantité. */
function stockFromQty(q) { return q <= 0 ? 'out' : (q <= LOW_STOCK ? 'low' : 'in'); }

/** Rend `qty` et `stock` cohérents sur un produit (mutation en place). */
function normalizeStock(p) {
  p.qty = qtyOf(p);
  p.stock = stockFromQty(p.qty);
  return p;
}

/** Phrase affichable : « Plus que 2 pièces », « Épuisé »… */
function stockText(p) {
  const q = qtyOf(p);
  if (q <= 0) return 'Épuisé';
  if (q <= LOW_STOCK) return q === 1 ? 'Dernière pièce !' : `Plus que ${q} pièces`;
  return 'En stock';
}

const ProductDB = {
  getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.saveAll(DEFAULT_PRODUCTS);
      return [...DEFAULT_PRODUCTS];
    }
    try { return JSON.parse(raw).map(normalizeStock); } catch { return [...DEFAULT_PRODUCTS]; }
  },
  /** Produits visibles côté public (status=live ou non défini) */
  getLive() { return this.getAll().filter(p => (p.status || 'live') === 'live'); },
  saveAll(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.map(normalizeStock))); },
  add(p) {
    const list = this.getAll();
    p.id = list.length ? Math.max(...list.map(x=>x.id))+1 : 1;
    p.createdAt = Date.now();
    p.status = p.status || 'live';
    normalizeStock(p);
    p.qtyUpdatedAt = Date.now();
    p.qtyDirty = true;                 // stock initial saisi par le magasin
    list.push(p); this.saveAll(list); return p;
  },

  /** Après publication réussie : les quantités saisies sont acquises. */
  clearQtyDirty() {
    const list = this.getAll();
    let n = 0;
    list.forEach(p => { if (p.qtyDirty) { delete p.qtyDirty; n++; } });
    if (n) this.saveAll(list);
    return n;
  },
  update(id, data) {
    const list = this.getAll();
    const i = list.findIndex(p => p.id === id);
    if (i >= 0) {
      // Une quantité saisie par le magasin est marquée `qtyDirty` : à la
      // prochaine publication, elle s'imposera au serveur. Sans ce
      // marqueur, le serveur garde sa propre valeur (celle qu'il a
      // décrémentée au fil des commandes).
      if (data.qty !== undefined && qtyOf(data) !== qtyOf(list[i])) {
        data.qtyUpdatedAt = Date.now();
        data.qtyDirty = true;
      }
      list[i] = normalizeStock({ ...list[i], ...data, id });
      this.saveAll(list);
    }
    return list[i];
  },

  /* --- Miroir local des mouvements de stock ---------------------------
     Le serveur fait foi (/api/orders décrémente le catalogue publié),
     mais on applique le même mouvement localement pour que l'écran
     affiche le bon chiffre immédiatement, sans attendre la resynchro. */
  applyStockMove(lines, sign) {
    const list = this.getAll();
    let touched = false;
    (lines || []).forEach(l => {
      const p = list.find(x => x.id === Number(l.productId));
      if (!p) return;
      const n = Math.max(0, qtyOf(p) + sign * Math.max(1, Number(l.qty) || 1));
      p.qty = n; p.stock = stockFromQty(n); p.qtyUpdatedAt = Date.now();
      touched = true;
    });
    if (touched) this.saveAll(list);
    return touched;
  },
  /** Retire du stock les articles d'une commande. */
  decrementStock(lines) { return this.applyStockMove(lines, -1); },
  /** Remet en stock les articles d'une commande annulée. */
  restoreStock(lines)   { return this.applyStockMove(lines, +1); },
  remove(id) {
    const list = this.getAll().filter(p => p.id !== id);
    this.saveAll(list);
  },
  /** Duplique un produit avec un nouvel id */
  duplicate(id) {
    const p = this.getAll().find(x => x.id === id);
    if (!p) return null;
    const copy = { ...p, name: p.name + ' (copie)', status: 'draft' };
    delete copy.id;
    return this.add(copy);
  },
  /** Bascule live <-> draft */
  toggleStatus(id) {
    const p = this.getAll().find(x => x.id === id);
    if (!p) return;
    return this.update(id, { status: p.status === 'live' ? 'draft' : 'live' });
  },
  reset() { this.saveAll(DEFAULT_PRODUCTS); },
  /** N derniers produits live (par createdAt DESC) */
  newest(n = 8) {
    return [...this.getLive()]
      .sort((a,b) => (b.createdAt || b.id) - (a.createdAt || a.id))
      .slice(0, n);
  },
  /** Vrai si createdAt < 14 jours */
  isNew(p) {
    if (!p.createdAt) return false;
    return (Date.now() - p.createdAt) < 14 * 24 * 3600 * 1000;
  },
  /** Export CSV de tout le catalogue */
  exportCSV() {
    const rows = this.getAll();
    const headers = ['id','name','type','sub','cat','price','oldPrice','qty','stock','status','sizes','material','desc','imageUrl'];
    const csv = [
      headers.join(';'),
      ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(';'))
    ].join('\n');
    return '﻿' + csv; // BOM pour Excel
  }
};

/* ============================================================
   SYNCHRO CATALOGUE SERVEUR (audit V1)
   Au chargement, on remplace le catalogue local par la version
   publiée par l'admin (/api/catalog, Netlify Blobs). En préview
   locale ou hors-ligne : silencieux, le catalogue par défaut reste.
   ============================================================ */
async function syncCatalogFromServer() {
  try {
    const r = await fetch('/api/catalog');
    if (!r.ok) return false; // 404 = rien de publié encore
    const list = await r.json();
    if (!Array.isArray(list) || !list.length) return false;
    ProductDB.saveAll(list);
    return true;
  } catch { return false; }
}

/* ============================================================
   API WISHLIST
   ============================================================ */
const WishlistDB = {
  getAll() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
    catch { return []; }
  },
  has(id)   { return this.getAll().includes(id); },
  count()   { return this.getAll().length; },
  toggle(id) {
    const list = this.getAll();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
    return this.has(id);
  },
  clear() { localStorage.removeItem(WISHLIST_KEY); }
};

/* ============================================================
   API REVIEWS (avis produits)
   ============================================================ */
const ReviewDB = {
  getAll() {
    try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}'); }
    catch { return {}; }
  },
  forProduct(id) {
    return this.getAll()[id] || [];
  },
  add(productId, review) {
    const all = this.getAll();
    if (!all[productId]) all[productId] = [];
    all[productId].unshift({ ...review, date: Date.now() });
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(all));
  },
  averageRating(productId, fallback) {
    const list = this.forProduct(productId);
    if (!list.length) return fallback ?? null;
    return list.reduce((s,r) => s + r.rating, 0) / list.length;
  }
};

/* ============================================================
   API CART (panier) — multi-articles avec taille/quantité
   ============================================================ */
const CartDB = {
  getAll() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  },
  count() { return this.getAll().reduce((s, i) => s + i.qty, 0); },

  /** Stock disponible d'un produit, toutes tailles confondues. */
  stockFor(productId) {
    const p = ProductDB.getAll().find(x => x.id === productId);
    return p ? qtyOf(p) : 0;
  },
  /** Ce qu'on peut encore ajouter au panier pour ce produit. */
  remainingFor(productId, exceptSize = null) {
    const inCart = this.getAll()
      .filter(i => i.productId === productId && i.size !== exceptSize)
      .reduce((s, i) => s + i.qty, 0);
    return Math.max(0, this.stockFor(productId) - inCart);
  },

  /** Ajoute au panier sans jamais dépasser le stock réel.
   *  Renvoie la quantité effectivement ajoutée (0 si épuisé). */
  add(productId, size, qty = 1) {
    const max = this.remainingFor(productId);
    const add = Math.max(0, Math.min(qty, max));
    if (!add) return 0;
    const items = this.getAll();
    const ex = items.find(i => i.productId === productId && i.size === size);
    if (ex) ex.qty += add;
    else items.push({ productId, size, qty: add });
    this._save(items);
    return add;
  },
  setQty(productId, size, qty) {
    const items = this.getAll();
    const i = items.find(x => x.productId === productId && x.size === size);
    if (!i) return;
    if (qty <= 0) return this.remove(productId, size);
    // Plafond = stock du produit moins ce qui est déjà pris dans les autres tailles
    i.qty = Math.max(1, Math.min(99, qty, this.remainingFor(productId, size)));
    this._save(items);
  },
  remove(productId, size) {
    const items = this.getAll().filter(i => !(i.productId === productId && i.size === size));
    this._save(items);
  },
  clear() { localStorage.removeItem(CART_KEY); },
  _save(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); },
  /** Retourne les items enrichis avec les infos produit */
  getDetailed() {
    const products = ProductDB.getAll();
    return this.getAll()
      .map(item => ({ ...item, product: products.find(p => p.id === item.productId) }))
      .filter(x => x.product);
  },
  total() {
    return this.getDetailed().reduce((s, x) => s + x.product.price * x.qty, 0);
  }
};

/* ============================================================
   API USER (compte client, localStorage uniquement)
   ⚠️ Mot de passe stocké encodé en base64 — c'est un demo
   client-side. Pour vraie sécurité serveur : Netlify Identity
   ou backend Supabase / Firebase.
   ============================================================ */
const UserDB = {
  /** SHA-256 salé via WebCrypto (asynchrone). L'ancien « hash » base64
   *  (réversible) est migré automatiquement au premier login réussi. */
  async _hash(pwd) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd + '·casal'));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  },
  /** Ancien encodage base64 — conservé uniquement pour la migration */
  _legacyHash(pwd) { return btoa(unescape(encodeURIComponent(pwd + '·casal'))); },

  get() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  },
  exists() { return !!this.get(); },
  _save(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); },

  async signup({ email, password, name, phone, address }) {
    if (this.exists()) return { ok:false, error:'Un compte existe déjà sur ce navigateur. Connecte-toi ou supprime le compte existant.' };
    if (!email || !password || password.length < 6) return { ok:false, error:'Mot de passe : 6 caractères minimum.' };
    const u = {
      email: email.trim().toLowerCase(),
      name: (name || '').trim(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      passwordHash: await this._hash(password),
      createdAt: Date.now(),
      giftCards: [],
      rating: null
    };
    this._save(u);
    this._startSession(u.email);
    return { ok:true, user:u };
  },

  async login(email, password) {
    const u = this.get();
    if (!u) return { ok:false, error:'Aucun compte trouvé. Inscris-toi !' };
    if (u.email !== email.trim().toLowerCase()) return { ok:false, error:'Email incorrect.' };
    const sha = await this._hash(password);
    if (u.passwordHash !== sha) {
      // Migration : compte créé avec l'ancien encodage base64
      if (u.passwordHash === this._legacyHash(password)) {
        u.passwordHash = sha;
        this._save(u);
      } else {
        return { ok:false, error:'Mot de passe incorrect.' };
      }
    }
    this._startSession(u.email);
    return { ok:true, user:u };
  },

  logout() { localStorage.removeItem(SESSION_KEY); },

  /** Mot de passe oublié : vérifie l'e-mail du compte (sur cet appareil)
   *  puis redéfinit le mot de passe et ouvre la session. */
  async resetPassword(email, newPwd) {
    const u = this.get();
    if (!u) return { ok:false, error:"Aucun compte n'existe sur cet appareil." };
    if (u.email !== email.trim().toLowerCase())
      return { ok:false, error:"Cet e-mail ne correspond à aucun compte sur cet appareil." };
    if (!newPwd || newPwd.length < 6) return { ok:false, error:'Nouveau mot de passe : 6 caractères minimum.' };
    u.passwordHash = await this._hash(newPwd);
    this._save(u);
    this._startSession(u.email);
    return { ok:true, user:u };
  },

  _startSession(email) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email, ts:Date.now() }));
  },

  /** Session de 30 jours */
  isLoggedIn() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s) return false;
      const MAX = 1000 * 60 * 60 * 24 * 30;
      if (Date.now() - s.ts > MAX) { this.logout(); return false; }
      return true;
    } catch { return false; }
  },

  updateProfile(updates) {
    const u = this.get(); if (!u) return false;
    const allowed = ['name','phone','address','email'];
    allowed.forEach(k => { if (k in updates) u[k] = String(updates[k]).trim(); });
    if ('email' in updates) u.email = u.email.toLowerCase();
    this._save(u);
    return true;
  },

  async changePassword(oldPwd, newPwd) {
    const u = this.get();
    if (!u) return { ok:false, error:'Pas de compte.' };
    const oldSha = await this._hash(oldPwd);
    if (u.passwordHash !== oldSha && u.passwordHash !== this._legacyHash(oldPwd))
      return { ok:false, error:'Ancien mot de passe incorrect.' };
    if (!newPwd || newPwd.length < 6) return { ok:false, error:'Nouveau mot de passe : 6 caractères min.' };
    u.passwordHash = await this._hash(newPwd);
    this._save(u);
    return { ok:true };
  },

  deleteAccount() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  },

  /** Note du site (1-5) + commentaire optionnel */
  saveRating(stars, comment) {
    const u = this.get();
    if (u) { u.rating = { stars, comment: comment || '', date: Date.now() }; this._save(u); }
    localStorage.setItem(RATING_KEY, JSON.stringify({ stars, comment: comment || '', date: Date.now(), email: u?.email || null }));
  }
};


/* ============================================================
   SUIVI DE COMMANDE — étapes du click & collect (retrait Mamoudzou)
   ============================================================ */
const ORDER_STATUS_FLOW = [
  { id:'recue',       icon:'📥', label:'Reçue',           desc:'Commande bien reçue' },
  { id:'confirmee',   icon:'✅', label:'Confirmée',       desc:'Disponibilité et paiement validés' },
  { id:'preparation', icon:'📦', label:'En préparation',  desc:'Ta commande est en cours de préparation' },
  { id:'prete',       icon:'🛍️', label:'Prête au retrait', desc:'Viens la chercher à la boutique de Mamoudzou (rue du Commerce) avec ton code de retrait' },
  { id:'retiree',     icon:'🎉', label:'Retirée',         desc:'Commande remise — merci et bon sport !' }
];
/** Index d'un statut dans le flux (gère l'ancien statut "envoyée") */
function orderStatusIndex(status) {
  const s = (status === 'envoyée' || !status) ? 'recue' : status;
  const i = ORDER_STATUS_FLOW.findIndex(x => x.id === s);
  return i < 0 ? 0 : i;
}

/* ============================================================
   FENÊTRE DE MODIFICATION / ANNULATION CLIENT (6 h après commande)
   ============================================================ */
const ORDER_CANCEL_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 heures

/** Horodatage de création (id = Date.now() à la création, sinon date ISO) */
function orderCreatedAt(o) {
  return o.id || (o.date ? Date.parse(o.date) : Date.now());
}

/** Millisecondes restantes pour annuler/modifier ; 0 si fenêtre fermée
 *  (délai dépassé, déjà annulée, ou déjà retirée). */
function cancelWindowLeftMs(o) {
  if (!o || o.status === 'annulee' || o.status === 'retiree') return 0;
  return Math.max(0, ORDER_CANCEL_WINDOW_MS - (Date.now() - orderCreatedAt(o)));
}

/** « 5h 12min » à partir d'une durée en ms */
function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

/** Code de retrait unique ZB-XXXX-XXXX (caractères non ambigus) */
function generatePickupCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const block = () => Array.from(
    (crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(4)) : [0,0,0,0].map(() => Math.floor(Math.random()*256))),
    b => chars[b % chars.length]
  ).join('');
  return `ZB-${block()}-${block()}`;
}

/* ============================================================
   API ORDERS (sauvegarde locale des commandes)
   ============================================================ */
const OrderDB = {
  getAll() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
    catch { return []; }
  },
  _save(list) { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); },
  add(order) {
    const list = this.getAll();
    const now = Date.now();
    const saved = {
      ...order,
      id: now,
      pickupCode: order.pickupCode || generatePickupCode(),
      date: new Date().toISOString(),
      status: 'recue',
      statusHistory: [{ status:'recue', date: now }]
    };
    list.unshift(saved);
    this._save(list);
    return saved;
  },
  remove(id) {
    this._save(this.getAll().filter(o => o.id !== id));
  },
  clear() { localStorage.removeItem(ORDERS_KEY); },
  count() { return this.getAll().length; },

  /** Admin : fait avancer (ou reculer) le statut d'une commande */
  setStatus(id, status) {
    const list = this.getAll();
    const o = list.find(x => x.id === id);
    if (!o) return null;
    o.status = status;
    o.statusHistory = o.statusHistory || [];
    // Un seul jalon par statut : on remplace si re-cliqué
    o.statusHistory = o.statusHistory.filter(h => h.status !== status);
    o.statusHistory.push({ status, date: Date.now() });
    this._save(list);
    return o;
  },

  /** Génère le payload du lien de suivi (base64url) */
  trackingPayload(id) {
    const o = this.getAll().find(x => x.id === id);
    if (!o) return null;
    const data = {
      v: 1,
      id: o.id,
      s: o.status || 'recue',
      h: (o.statusHistory || []).map(h => [h.status, h.date]),
      t: o.total || '',
      n: (o.items && o.items.length)
        ? (o.items[0].productName + (o.items.length > 1 ? ` +${o.items.length - 1}` : ''))
        : (o.productName || 'Commande')
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },

  /** Client : applique un payload de suivi reçu par lien */
  applyTracking(payload) {
    let data;
    try {
      const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      data = JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch { return null; }
    if (!data || data.v !== 1 || !data.id) return null;
    const list = this.getAll();
    let o = list.find(x => x.id === data.id);
    if (o) {
      o.status = data.s;
      o.statusHistory = (data.h || []).map(([status, date]) => ({ status, date }));
    } else {
      // Commande passée sur un autre appareil : on crée une fiche de suivi minimale
      o = {
        id: data.id,
        date: new Date(data.id).toISOString(),
        status: data.s,
        statusHistory: (data.h || []).map(([status, date]) => ({ status, date })),
        total: data.t,
        items: [{ productName: data.n, size: '—', qty: 1 }],
        tracked: true
      };
      list.unshift(o);
    }
    this._save(list);
    return o;
  }
};
