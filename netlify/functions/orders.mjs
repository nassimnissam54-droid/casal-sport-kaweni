/* ==========================================================================
   /api/orders — administration des commandes (protégé).
   Auth : en-tête "x-admin-key" == variable d'environnement ADMIN_PASSWORD.
   - GET  ?q=   : liste (recherche par code de retrait, nom, e-mail, n°)
   - PATCH      : { id, pickupStatus?, paymentStatus? }
   ========================================================================== */
import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function checkAuth(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return json({ error: "ADMIN_PASSWORD non configuré sur Netlify." }, 500);
  if (req.headers.get("x-admin-key") !== expected)
    return json({ error: "Mot de passe incorrect." }, 401);
  return null;
}

export default async (req) => {
  const denied = checkAuth(req);
  if (denied) return denied;

  const blobs = getStore("casal-sport");

  if (req.method === "GET") {
    const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
    const { blobs: keys } = await blobs.list({ prefix: "orders/" });
    const orders = (
      await Promise.all(keys.map((k) => blobs.get(k.key, { type: "json" })))
    ).filter(Boolean);
    orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const filtered = !q
      ? orders
      : orders.filter((o) =>
          [o.pickupCode, o.orderId, o.customer.name, o.customer.email, o.customer.phone]
            .join(" ").toLowerCase().includes(q)
        );
    return json(filtered.slice(0, 200));
  }

  if (req.method === "PATCH") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
    const key = `orders/${body.id}`;
    const order = await blobs.get(key, { type: "json" });
    if (!order) return json({ error: "Commande introuvable" }, 404);
    if (body.pickupStatus) order.pickupStatus = body.pickupStatus;
    if (body.paymentStatus) order.paymentStatus = body.paymentStatus;
    order.updatedAt = new Date().toISOString();
    await blobs.setJSON(key, order);
    return json(order);
  }

  return json({ error: "Méthode non autorisée" }, 405);
};
