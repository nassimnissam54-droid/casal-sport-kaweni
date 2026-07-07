/* ============================================================
   CASAL SPORT - Donnees & API
   ============================================================ */

const STORAGE_KEY  = 'casal_products_v3';
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
  shopName: 'CASAL SPORT',
  socials: {
    instagram: 'https://instagram.com/',
    facebook:  'https://facebook.com/',
    tiktok:    'https://tiktok.com/'
  }
};

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
      desc:'Terminal de paiement au magasin de Kawéni, au moment du retrait' },
    { id:'cash', icon:'💵', label:'Espèces au retrait',
      desc:'Tu règles ta commande au magasin en venant la chercher' },
    { id:'transfer', icon:'🏦', label:'Virement bancaire',
      desc:'RIB envoyé par message — commande remise après réception du virement' }
  ]
};

/* ============================================================
   CODES PROMO
   ============================================================ */
const PROMO_CODES = {
  'BIENVENUE10': { type:'percent', value:10, label:'-10% bienvenue' },
  'KAWENI15':    { type:'percent', value:15, label:'-15% Kawéni' },
  'CLUB20':      { type:'percent', value:20, label:'-20% clubs & assos' }
};

/* ============================================================
   TYPES D'ARTICLES (sous-catégories des onglets Homme/Femme/Garçon/Fille)
   ============================================================ */
const SUB_LABELS = {
  tshirt:      'Tee-shirt',
  ensemble:    'Ensemble',
  casquette:   'Casquette',
  short:       'Short',
  chaussettes: 'Chaussettes',
  basket:      'Basket',
  equipement:  'Équipement'
};

/* ============================================================
   PRODUITS PAR DEFAUT (avec photos Unsplash + stock + textes plus emotionnels)
   ============================================================ */
const NOW = Date.now();
const D = day => NOW - day * 24 * 3600 * 1000;

const DEFAULT_PRODUCTS = [
  /* ===================== HOMME ===================== */
  { id:1, type:'vetement', sub:'tshirt', cat:'homme', name:'Tee-shirt Training Homme',
    price:19.99, oldPrice:null, badge:'',
    desc:"Le tee-shirt technique de toutes tes séances. Tissu respirant à séchage rapide, coupe athlétique — reste au sec même sous le soleil de Mayotte.",
    material:'100% Polyester respirant · Anti-transpiration',
    sizes:'XS — S — M — L — XL — XXL',
    icon:'👕', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80',
    color1:'#2d3436', color2:'#d63031', createdAt: D(2), rating:4.8 },

  { id:2, type:'vetement', sub:'ensemble', cat:'homme', name:'Ensemble Survêtement Homme',
    price:49.99, oldPrice:59.99, badge:'-17%',
    desc:"Veste zippée + pantalon assorti : l'ensemble complet de l'échauffement à la récup. Tissu tricot résistant, doublure mesh respirante.",
    material:'100% Polyester tricot · Doublure mesh',
    sizes:'S — M — L — XL — XXL',
    icon:'🧥', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80',
    color1:'#0f3460', color2:'#533483', createdAt: D(6), rating:4.7 },

  { id:3, type:'vetement', sub:'casquette', cat:'homme', name:'Casquette Perf Homme',
    price:14.99, oldPrice:null, badge:'',
    desc:"Légère, aérée, anti-UV : la casquette qui te suit du running au terrain. Bandeau intérieur anti-transpiration, réglage rapide.",
    material:'Polyester léger · Œillets d\'aération · Anti-UV',
    sizes:'Taille unique — réglable',
    icon:'🧢', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80',
    color1:'#2d3436', color2:'#636e72', createdAt: D(4), rating:4.6 },

  { id:4, type:'vetement', sub:'short', cat:'homme', name:'Short Training Pro Homme',
    price:24.99, oldPrice:null, badge:'',
    desc:"Le short qui suit tous tes entraînements. Tissu léger et extensible, poche zippée pour le téléphone, taille élastique avec cordon.",
    material:'88% Polyester · 12% Élasthanne',
    sizes:'S — M — L — XL — XXL',
    icon:'🩳', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&q=80',
    color1:'#2d3436', color2:'#636e72', createdAt: D(15), rating:4.6 },

  { id:5, type:'vetement', sub:'chaussettes', cat:'homme', name:'Chaussettes Sport Homme ×3',
    price:9.99, oldPrice:null, badge:'',
    desc:"Lot de 3 paires renforcées talon et pointe. Maintien de la voûte plantaire, tissu respirant — le basique qu'on n'a jamais en trop.",
    material:'75% Coton peigné · 23% Polyamide · 2% Élasthanne',
    sizes:'39-42 — 43-46',
    icon:'🧦', stock:'in', status:'live',
    imageUrl:'',
    color1:'#2d3436', color2:'#0984e3', createdAt: D(10), rating:4.5 },

  { id:6, type:'basket', sub:'basket', cat:'homme', name:'Basket Pulse Runner',
    price:89.99, oldPrice:null, badge:'',
    desc:"Légère, réactive, taillée pour la route et la chaleur. Amorti dynamique, tige mesh ultra-respirante — ton record perso commence ici.",
    material:'Tige mesh · Semelle EVA · Gomme carbone',
    sizes:'40 — 41 — 42 — 43 — 44 — 45',
    icon:'👟', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    color1:'#d63031', color2:'#e17055', createdAt: D(1), rating:4.9 },

  { id:7, type:'basket', sub:'basket', cat:'homme', name:'Basket Court Pro Mid',
    price:79.99, oldPrice:null, badge:'',
    desc:"Maintien de cheville renforcé et grip qui accroche le parquet comme le playground. Pour dominer la raquette des deux côtés du terrain.",
    material:'Cuir synthétique · Mesh · Semelle multi-surfaces',
    sizes:'40 — 41 — 42 — 43 — 44 — 45 — 46',
    icon:'🏀', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&q=80',
    color1:'#2d3436', color2:'#d63031', createdAt: D(7), rating:4.8 },

  /* ===================== FEMME ===================== */
  { id:8, type:'vetement', sub:'tshirt', cat:'femme', name:'Tee-shirt Respirant Femme',
    price:19.99, oldPrice:null, badge:'',
    desc:"Coupe ajustée, tissu ultra-doux à séchage rapide. Du yoga au fractionné, il ne bouge pas, toi si.",
    material:'92% Polyester recyclé · 8% Élasthanne',
    sizes:'XS — S — M — L — XL',
    icon:'👚', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    color1:'#fd79a8', color2:'#e84393', createdAt: D(1), rating:5.0 },

  { id:9, type:'vetement', sub:'ensemble', cat:'femme', name:'Ensemble Training Femme',
    price:44.99, oldPrice:null, badge:'',
    desc:"Brassière maintien élevé + legging sculptant assorti. Opaque en squat, ceinture gainante — la panoplie complète de la salle au studio.",
    material:'75% Polyamide · 25% Élasthanne',
    sizes:'XS — S — M — L — XL',
    icon:'🧘', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&q=80',
    color1:'#6c5ce7', color2:'#a29bfe', createdAt: D(3), rating:4.8 },

  { id:10, type:'vetement', sub:'casquette', cat:'femme', name:'Casquette Run Femme',
    price:14.99, oldPrice:null, badge:'',
    desc:"Profil bas, tissu léger anti-UV et passage pour queue de cheval. Ta meilleure alliée des sorties longues au soleil.",
    material:'Polyester léger · Anti-UV · Réglage scratch',
    sizes:'Taille unique — réglable',
    icon:'🧢', stock:'in', status:'live',
    imageUrl:'',
    color1:'#fd79a8', color2:'#ffeaa7', createdAt: D(5), rating:4.7 },

  { id:11, type:'vetement', sub:'short', cat:'femme', name:'Short Running Femme',
    price:24.99, oldPrice:29.99, badge:'-17%',
    desc:"Ultra-léger, presque invisible sur la foulée. Cuissard intégré anti-frottement, bande réfléchissante — pense à toi, pas à ta tenue.",
    material:'100% Polyester léger déperlant',
    sizes:'XS — S — M — L — XL',
    icon:'🏃', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1483721310020-03333e577078?w=600&q=80',
    color1:'#00b894', color2:'#55efc4', createdAt: D(20), rating:4.7 },

  { id:12, type:'vetement', sub:'chaussettes', cat:'femme', name:'Chaussettes Run Femme ×3',
    price:9.99, oldPrice:null, badge:'',
    desc:"Lot de 3 paires fines et respirantes, zéro couture qui frotte. Maintien doux de la voûte — tes pieds diront merci au 10e kilomètre.",
    material:'78% Coton peigné · 20% Polyamide · 2% Élasthanne',
    sizes:'35-38 — 39-42',
    icon:'🧦', stock:'in', status:'live',
    imageUrl:'',
    color1:'#fd79a8', color2:'#a29bfe', createdAt: D(12), rating:4.6 },

  { id:13, type:'basket', sub:'basket', cat:'femme', name:'Basket Air Flow W',
    price:84.99, oldPrice:null, badge:'',
    desc:"L'amorti nuage pour tes kilomètres. Drop doux, mousse à retour d'énergie, coloris pastel — la running qui donne envie de se lever tôt.",
    material:'Mesh technique · Mousse à retour d\'énergie',
    sizes:'36 — 37 — 38 — 39 — 40 — 41',
    icon:'👟', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80',
    color1:'#a29bfe', color2:'#fd79a8', createdAt: D(2), rating:5.0 },

  { id:14, type:'basket', sub:'basket', cat:'femme', name:'Basket Studio Trainer W',
    price:59.99, oldPrice:null, badge:'',
    desc:"Stable en squat, souple en burpee. Semelle plate adhérente, maintien latéral — la polyvalente du cross-training et des cours collectifs.",
    material:'Toile renforcée · Semelle caoutchouc plate',
    sizes:'36 — 37 — 38 — 39 — 40 — 41',
    icon:'🤸', stock:'low', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&q=80',
    color1:'#6c5ce7', color2:'#00cec9', createdAt: D(18), rating:4.6 },

  /* ===================== GARÇON ===================== */
  { id:15, type:'vetement', sub:'tshirt', cat:'garcon', name:'Tee-shirt Sport Garçon',
    price:12.99, oldPrice:null, badge:'',
    desc:"Respirant, résistant aux récrés comme aux entraînements. Tissu doux qui garde ses couleurs lavage après lavage.",
    material:'100% Polyester respirant',
    sizes:'6A — 8A — 10A — 12A — 14A',
    icon:'👕', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&q=80',
    color1:'#0984e3', color2:'#74b9ff', createdAt: D(5), rating:4.9 },

  { id:16, type:'vetement', sub:'ensemble', cat:'garcon', name:'Ensemble Survêtement Garçon',
    price:39.99, oldPrice:null, badge:'',
    desc:"Veste zippée + pantalon assorti pour les champions de demain. Coupe confortable, tissu costaud, poches zippées.",
    material:'100% Polyester tricot · Doublure mesh',
    sizes:'6A — 8A — 10A — 12A — 14A',
    icon:'⚽', stock:'in', status:'live',
    imageUrl:'',
    color1:'#0984e3', color2:'#00b894', createdAt: D(8), rating:4.8 },

  { id:17, type:'vetement', sub:'casquette', cat:'garcon', name:'Casquette Junior Garçon',
    price:9.99, oldPrice:null, badge:'',
    desc:"Anti-UV et réglable : la protection soleil des petits sportifs, du bord du terrain à la plage.",
    material:'Coton twill · Anti-UV · Réglage scratch',
    sizes:'Enfant — réglable',
    icon:'🧢', stock:'in', status:'live',
    imageUrl:'',
    color1:'#0984e3', color2:'#ffeaa7', createdAt: D(9), rating:4.6 },

  { id:18, type:'vetement', sub:'short', cat:'garcon', name:'Short Foot Garçon',
    price:14.99, oldPrice:null, badge:'',
    desc:"Le short de match et d'entraînement. Léger, séchage rapide, taille élastique — prêt pour tous les terrains de l'île.",
    material:'100% Polyester à séchage rapide',
    sizes:'6A — 8A — 10A — 12A — 14A',
    icon:'🩳', stock:'in', status:'live',
    imageUrl:'',
    color1:'#00b894', color2:'#0984e3', createdAt: D(11), rating:4.7 },

  { id:19, type:'vetement', sub:'chaussettes', cat:'garcon', name:'Chaussettes Sport Garçon ×3',
    price:7.99, oldPrice:null, badge:'',
    desc:"Lot de 3 paires renforcées pour les journées qui n'arrêtent pas. Douces, respirantes, faciles à assortir.",
    material:'75% Coton · 23% Polyamide · 2% Élasthanne',
    sizes:'27-30 — 31-34 — 35-38',
    icon:'🧦', stock:'in', status:'live',
    imageUrl:'',
    color1:'#0984e3', color2:'#636e72', createdAt: D(13), rating:4.5 },

  { id:20, type:'basket', sub:'basket', cat:'garcon', name:'Basket Junior Flash',
    price:44.99, oldPrice:null, badge:'',
    desc:"Scratch facile, semelle qui absorbe les sprints de récré. Renfort à la pointe pour durer toute l'année scolaire — et après.",
    material:'Mesh + synthétique · Semelle EVA souple',
    sizes:'28 — 30 — 32 — 34 — 36 — 38',
    icon:'⚡', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80',
    color1:'#0984e3', color2:'#00b894', createdAt: D(9), rating:4.9 },

  /* ===================== FILLE ===================== */
  { id:21, type:'vetement', sub:'tshirt', cat:'fille', name:'Tee-shirt Sport Fille',
    price:12.99, oldPrice:null, badge:'',
    desc:"Doux, léger et respirant — pour courir, danser et tout le reste. Couleurs éclatantes qui résistent au lavage.",
    material:'100% Polyester respirant',
    sizes:'6A — 8A — 10A — 12A — 14A',
    icon:'👚', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80',
    color1:'#e84393', color2:'#fd79a8', createdAt: D(4), rating:4.8 },

  { id:22, type:'vetement', sub:'ensemble', cat:'fille', name:'Ensemble Training Fille',
    price:34.99, oldPrice:null, badge:'',
    desc:"Brassière légère + legging assorti pour bouger sans limite. Matière douce et extensible, coutures plates — gym, danse et athlé.",
    material:'80% Polyamide · 20% Élasthanne',
    sizes:'6A — 8A — 10A — 12A — 14A',
    icon:'🤸', stock:'in', status:'live',
    imageUrl:'',
    color1:'#e84393', color2:'#a29bfe', createdAt: D(8), rating:4.8 },

  { id:23, type:'vetement', sub:'casquette', cat:'fille', name:'Casquette Junior Fille',
    price:9.99, oldPrice:null, badge:'',
    desc:"Anti-UV, réglable, avec passage pour queue de cheval. Le soleil de Mayotte n'a qu'à bien se tenir.",
    material:'Coton twill · Anti-UV · Réglage scratch',
    sizes:'Enfant — réglable',
    icon:'🧢', stock:'in', status:'live',
    imageUrl:'',
    color1:'#fd79a8', color2:'#ffeaa7', createdAt: D(10), rating:4.7 },

  { id:24, type:'vetement', sub:'short', cat:'fille', name:'Short Gym Fille',
    price:14.99, oldPrice:null, badge:'',
    desc:"Souple et léger, avec cuissard intégré pour bouger en toute liberté. Parfait pour la gym, la danse et le sport à l'école.",
    material:'90% Polyester · 10% Élasthanne',
    sizes:'6A — 8A — 10A — 12A — 14A',
    icon:'🩳', stock:'in', status:'live',
    imageUrl:'',
    color1:'#e84393', color2:'#55efc4', createdAt: D(12), rating:4.6 },

  { id:25, type:'vetement', sub:'chaussettes', cat:'fille', name:'Chaussettes Sport Fille ×3',
    price:7.99, oldPrice:null, badge:'',
    desc:"Lot de 3 paires toutes douces, sans couture qui gratte. Respirantes et colorées — les pieds aussi ont du style.",
    material:'75% Coton · 23% Polyamide · 2% Élasthanne',
    sizes:'27-30 — 31-34 — 35-38',
    icon:'🧦', stock:'in', status:'live',
    imageUrl:'',
    color1:'#fd79a8', color2:'#a29bfe', createdAt: D(14), rating:4.6 },

  { id:26, type:'basket', sub:'basket', cat:'fille', name:'Basket Runner Rose Fille',
    price:44.99, oldPrice:null, badge:'',
    desc:"Légère comme une plume, rose comme elle veut. Semelle souple, scratch rapide — pour courir, danser et tout le reste.",
    material:'Mesh respirant · Semelle EVA souple',
    sizes:'28 — 30 — 32 — 34 — 36',
    icon:'🌸', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80',
    color1:'#fd79a8', color2:'#ffeaa7', createdAt: D(14), rating:4.7 },

  /* ============ ÉQUIPEMENT (mixte — hors onglets genre) ============ */
  { id:27, type:'vetement', sub:'equipement', cat:'mixte', name:'Ballon Match Taille 5',
    price:22.99, oldPrice:null, badge:'',
    desc:"Cousu machine, homologué compétition. Excellente tenue en l'air, résistance à l'abrasion — prêt pour les terrains de toute l'île.",
    material:'Enveloppe PU · Vessie butyle haute rétention',
    sizes:'Taille 5',
    icon:'⚽', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80',
    color1:'#2d3436', color2:'#00b894', createdAt: D(4), rating:4.7 },

  { id:28, type:'vetement', sub:'equipement', cat:'mixte', name:'Haltères Hexa 2 × 10 kg',
    price:59.99, oldPrice:null, badge:'',
    desc:"La paire d'haltères qui ne roule pas. Revêtement caoutchouc anti-choc, poignée moletée chromée — muscu à la maison ou en salle.",
    material:'Fonte · Revêtement caoutchouc · Poignée acier',
    sizes:'2 × 10 kg',
    icon:'🏋️', stock:'low', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
    color1:'#2d3436', color2:'#e17055', createdAt: D(6), rating:4.9 },

  { id:29, type:'vetement', sub:'equipement', cat:'mixte', name:'Sac de Sport 45 L',
    price:39.99, oldPrice:null, badge:'',
    desc:"De la salle au terrain sans rien oublier. Compartiment chaussures ventilé, poche humide, bandoulière rembourrée.",
    material:'Polyester 600D déperlant · Zips renforcés',
    sizes:'45 L',
    icon:'🎒', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    color1:'#e17055', color2:'#fdcb6e', createdAt: D(12), rating:4.6 },

  { id:30, type:'vetement', sub:'equipement', cat:'mixte', name:'Corde à Sauter Speed',
    price:12.99, oldPrice:null, badge:'',
    desc:"Cardio express, n'importe où. Câble acier gainé, roulements à billes, longueur réglable — l'accessoire le plus rentable de ton sac.",
    material:'Câble acier gainé PVC · Poignées alu',
    sizes:'Réglable 3 m',
    icon:'⏱️', stock:'in', status:'live',
    imageUrl:'https://images.unsplash.com/photo-1434682881908-b43d0467b798?w=600&q=80',
    color1:'#00b894', color2:'#0984e3', createdAt: D(25), rating:4.5 }
];

/* ============================================================
   API PRODUITS
   ============================================================ */
const ProductDB = {
  getAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.saveAll(DEFAULT_PRODUCTS);
      return [...DEFAULT_PRODUCTS];
    }
    try { return JSON.parse(raw); } catch { return [...DEFAULT_PRODUCTS]; }
  },
  /** Produits visibles côté public (status=live ou non défini) */
  getLive() { return this.getAll().filter(p => (p.status || 'live') === 'live'); },
  saveAll(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); },
  add(p) {
    const list = this.getAll();
    p.id = list.length ? Math.max(...list.map(x=>x.id))+1 : 1;
    p.createdAt = Date.now();
    p.status = p.status || 'live';
    p.stock  = p.stock  || 'in';
    list.push(p); this.saveAll(list); return p;
  },
  update(id, data) {
    const list = this.getAll();
    const i = list.findIndex(p => p.id === id);
    if (i >= 0) { list[i] = { ...list[i], ...data, id }; this.saveAll(list); }
    return list[i];
  },
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
    const headers = ['id','name','type','sub','cat','price','oldPrice','stock','status','sizes','material','desc','imageUrl'];
    const csv = [
      headers.join(';'),
      ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(';'))
    ].join('\n');
    return '﻿' + csv; // BOM pour Excel
  }
};

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
  add(productId, size, qty = 1) {
    const items = this.getAll();
    const ex = items.find(i => i.productId === productId && i.size === size);
    if (ex) ex.qty += qty;
    else items.push({ productId, size, qty });
    this._save(items);
  },
  setQty(productId, size, qty) {
    const items = this.getAll();
    const i = items.find(x => x.productId === productId && x.size === size);
    if (!i) return;
    if (qty <= 0) return this.remove(productId, size);
    i.qty = Math.min(99, qty);
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
   SUIVI DE COMMANDE — étapes du click & collect (retrait Kawéni)
   ============================================================ */
const ORDER_STATUS_FLOW = [
  { id:'recue',       icon:'📥', label:'Reçue',           desc:'Commande bien reçue' },
  { id:'confirmee',   icon:'✅', label:'Confirmée',       desc:'Disponibilité et paiement validés' },
  { id:'preparation', icon:'📦', label:'En préparation',  desc:'Ta commande est en cours de préparation' },
  { id:'prete',       icon:'🛍️', label:'Prête au retrait', desc:'Viens la chercher au magasin de Kawéni avec ton code de retrait' },
  { id:'retiree',     icon:'🎉', label:'Retirée',         desc:'Commande remise — merci et bon sport !' }
];
/** Index d'un statut dans le flux (gère l'ancien statut "envoyée") */
function orderStatusIndex(status) {
  const s = (status === 'envoyée' || !status) ? 'recue' : status;
  const i = ORDER_STATUS_FLOW.findIndex(x => x.id === s);
  return i < 0 ? 0 : i;
}

/** Code de retrait unique CS-XXXX-XXXX (caractères non ambigus) */
function generatePickupCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const block = () => Array.from(
    (crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(4)) : [0,0,0,0].map(() => Math.floor(Math.random()*256))),
    b => chars[b % chars.length]
  ).join('');
  return `CS-${block()}-${block()}`;
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
