/* ==========================================================================
   POST /api/create-order — création d'une commande click & collect.
   - Recalcule les prix CÔTÉ SERVEUR (le client n'envoie que des ids/qty)
   - Génère un code de retrait unique CS-XXXX-XXXX
   - Enregistre la commande dans Netlify Blobs
   - Décrémente le stock
   - Envoie le reçu e-mail au client + notification au magasin (Resend)
   - Renvoie l'URL de paiement en ligne si configurée

   Variables d'environnement (Netlify → Site settings → Environment variables) :
   - RESEND_API_KEY   : clé API https://resend.com (envoi des reçus)
   - EMAIL_FROM       : expéditeur, ex "Casal Sport Kaweni <recu@votredomaine.com>"
   - STORE_EMAIL      : e-mail du magasin (copie de chaque commande)
   - PAYMENT_LINK_URL : lien de paiement (SumUp/Stripe). Placeholders
                        {amount} et {ref} remplacés, sinon ajoutés en query.
   - BANK_IBAN        : IBAN affiché pour le paiement par virement
   - STORE_NAME / STORE_ADDRESS / STORE_PHONE / STORE_HOURS : infos magasin
   ========================================================================== */
import { getStore } from "@netlify/blobs";

const PAY_LABELS = {
  card_online: "Carte bancaire en ligne",
  card_store: "Carte bancaire au magasin (au retrait)",
  cash: "Espèces au retrait",
  transfer: "Virement bancaire",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const storeInfo = () => ({
  name: process.env.STORE_NAME || "Casal Sport Kaweni",
  address: process.env.STORE_ADDRESS || "Zone commerciale de Kawéni, 97600 Mamoudzou, Mayotte",
  phone: process.env.STORE_PHONE || "",
  hours: process.env.STORE_HOURS || "Lun–Sam : 8h30 – 17h30",
});

/* Catalogue : version gérée en admin (Blobs) sinon fichier statique du site */
async function loadCatalog(req) {
  const store = getStore("casal-sport");
  const fromBlobs = await store.get("catalog", { type: "json" });
  if (fromBlobs) return fromBlobs;
  const r = await fetch(new URL("/data/products.json", req.url));
  return r.json();
}

function pickupCode() {
  // Caractères non ambigus (pas de O/0, I/1/L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => chars[b % chars.length]).join("");
  return `CS-${block()}-${block()}`;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requête invalide" }, 400);
  }

  const { customer, items, payment } = body || {};
  if (!customer?.name?.trim() || !customer?.email?.trim() || !customer?.phone?.trim())
    return json({ error: "Coordonnées incomplètes." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
    return json({ error: "Adresse e-mail invalide." }, 400);
  if (!Array.isArray(items) || !items.length)
    return json({ error: "Panier vide." }, 400);
  if (!PAY_LABELS[payment])
    return json({ error: "Mode de paiement inconnu." }, 400);

  /* Prix et stock recalculés côté serveur */
  const catalog = await loadCatalog(req);
  const lines = [];
  for (const it of items) {
    const p = catalog.find((c) => c.id === it.id);
    if (!p) return json({ error: `Produit inconnu : ${it.id}` }, 400);
    const qty = Math.max(1, Math.min(20, Number(it.qty) || 1));
    if (p.stock < qty)
      return json({ error: `Stock insuffisant pour « ${p.name} » (reste ${p.stock}).` }, 400);
    lines.push({
      id: p.id, name: p.name, price: p.price, qty,
      size: String(it.size || "").slice(0, 30),
      color: String(it.color || "").slice(0, 40),
      image: p.image,
    });
  }
  const total = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;

  const now = new Date();
  const orderId = `CMD-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${pickupCode().slice(3, 7)}`;
  const code = pickupCode();

  /* URL de paiement en ligne (SumUp / Stripe payment link) */
  let paymentUrl = null;
  if (payment === "card_online" && process.env.PAYMENT_LINK_URL) {
    const tpl = process.env.PAYMENT_LINK_URL;
    if (tpl.includes("{amount}") || tpl.includes("{ref}")) {
      paymentUrl = tpl.replaceAll("{amount}", total.toFixed(2)).replaceAll("{ref}", orderId);
    } else {
      const u = new URL(tpl);
      u.searchParams.set("amount", total.toFixed(2));
      u.searchParams.set("currency", "EUR");
      u.searchParams.set("checkout_reference", orderId);
      paymentUrl = u.href;
    }
  }

  const order = {
    orderId,
    pickupCode: code,
    createdAt: now.toISOString(),
    customer: {
      name: customer.name.trim().slice(0, 80),
      email: customer.email.trim().slice(0, 120),
      phone: customer.phone.trim().slice(0, 20),
    },
    items: lines,
    total,
    payment,
    paymentLabel: PAY_LABELS[payment],
    paymentStatus: payment === "card_online" ? "en_attente_paiement" : "a_payer_au_retrait",
    pickupStatus: "en_attente",
    paymentUrl,
  };

  /* Sauvegarde + décrément du stock */
  const blobs = getStore("casal-sport");
  await blobs.setJSON(`orders/${orderId}`, order);
  for (const l of lines) {
    const p = catalog.find((c) => c.id === l.id);
    p.stock = Math.max(0, p.stock - l.qty);
  }
  await blobs.setJSON("catalog", catalog);

  /* Reçu e-mail */
  const emailSent = await sendReceipt(order).catch((e) => {
    console.error("Envoi e-mail échoué :", e);
    return false;
  });

  return json({
    orderId,
    pickupCode: code,
    total,
    payment,
    items: lines,
    paymentUrl,
    emailSent,
  });
};

/* --------------------------------------------------------------- E-mail */
async function sendReceipt(order) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false; // pas de clé → la commande reste valide, code affiché à l'écran

  const from = process.env.EMAIL_FROM || "Casal Sport Kaweni <onboarding@resend.dev>";
  const shop = storeInfo();
  const html = receiptHtml(order, shop);

  const send = (to, subject) =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });

  const r = await send([order.customer.email], `Votre commande ${order.orderId} — code de retrait ${order.pickupCode}`);
  if (process.env.STORE_EMAIL) {
    await send([process.env.STORE_EMAIL], `🛒 Nouvelle commande ${order.orderId} (${order.customer.name})`).catch(() => {});
  }
  return r.ok;
}

function receiptHtml(order, shop) {
  const rows = order.items
    .map(
      (l) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.name}<br>
            <span style="color:#777;font-size:13px">${l.size} · ${l.color}</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${l.qty}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${(l.price * l.qty).toFixed(2)} €</td>
      </tr>`
    )
    .join("");

  const transferBlock =
    order.payment === "transfer" && process.env.BANK_IBAN
      ? `<p style="background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:12px 16px">
           🏦 <strong>Virement :</strong> IBAN <strong>${process.env.BANK_IBAN}</strong><br>
           Référence à indiquer : <strong>${order.orderId}</strong></p>`
      : "";

  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#0a0a0c;border-radius:12px 12px 0 0;padding:20px 24px">
      <span style="color:#fff;font-size:20px;font-weight:900">CASAL SPORT <span style="color:#ff9a3c">KAWENI</span></span>
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 6px">Merci ${order.customer.name} ! 🎉</h1>
      <p style="color:#555;margin:0 0 20px">Ta commande <strong>${order.orderId}</strong> du
        ${new Date(order.createdAt).toLocaleDateString("fr-FR")} est confirmée.</p>

      <div style="border:2px solid #ff4d2e;border-radius:12px;text-align:center;padding:20px;margin:20px 0">
        <p style="margin:0;color:#777;font-size:12px;letter-spacing:2px">CODE DE RETRAIT</p>
        <p style="margin:6px 0 0;font-size:34px;font-weight:900;letter-spacing:3px;color:#ff4d2e">${order.pickupCode}</p>
      </div>
      <p style="text-align:center;color:#555">Présente ce code en magasin à <strong>Kawéni</strong> pour retirer ta commande.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <thead><tr>
          <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #18181b;font-size:12px">ARTICLE</th>
          <th style="padding:8px 12px;border-bottom:2px solid #18181b;font-size:12px">QTÉ</th>
          <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #18181b;font-size:12px">TOTAL</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:12px;font-weight:900">TOTAL</td>
          <td style="padding:12px;text-align:right;font-weight:900;font-size:18px">${order.total.toFixed(2)} €</td>
        </tr></tfoot>
      </table>

      <p><strong>Mode de paiement :</strong> ${order.paymentLabel}</p>
      ${transferBlock}

      <div style="background:#fafafa;border-radius:8px;padding:14px 18px;margin-top:20px;font-size:14px;color:#555">
        🏬 <strong style="color:#18181b">${shop.name}</strong><br>
        ${shop.address}<br>
        ${shop.hours}${shop.phone ? `<br>☎ ${shop.phone}` : ""}
      </div>
      <p style="color:#999;font-size:12px;margin-top:20px">Retrait en point de vente uniquement — aucune livraison.
        Cet e-mail fait office de reçu de commande.</p>
    </div>
  </div>
</body></html>`;
}
