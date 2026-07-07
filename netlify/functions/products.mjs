/* ==========================================================================
   /api/products — catalogue produits.
   - GET (public)          : liste des produits (Blobs, sinon products.json)
   - POST (protégé)        : { action: "upsert", product } ou { action: "delete", id }
   Auth admin : en-tête "x-admin-key" == variable d'environnement ADMIN_PASSWORD.
   ========================================================================== */
import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function loadCatalog(req, blobs) {
  const fromBlobs = await blobs.get("catalog", { type: "json" });
  if (fromBlobs) return fromBlobs;
  const r = await fetch(new URL("/data/products.json", req.url));
  return r.json();
}

export default async (req) => {
  const blobs = getStore("casal-sport");

  if (req.method === "GET") {
    const catalog = await loadCatalog(req, blobs);
    return json(catalog, 200);
  }

  if (req.method === "POST") {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return json({ error: "ADMIN_PASSWORD non configuré sur Netlify." }, 500);
    if (req.headers.get("x-admin-key") !== expected)
      return json({ error: "Mot de passe incorrect." }, 401);

    let body;
    try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }

    const catalog = await loadCatalog(req, blobs);

    if (body.action === "upsert" && body.product?.id) {
      const p = body.product;
      const clean = {
        id: String(p.id).slice(0, 60),
        name: String(p.name || "").slice(0, 100),
        category: String(p.category || "equipement"),
        sport: String(p.sport || "fitness"),
        genre: String(p.genre || "mixte"),
        price: Math.max(0, Number(p.price) || 0),
        description: String(p.description || "").slice(0, 1000),
        matiere: String(p.matiere || "").slice(0, 300),
        sizes: Array.isArray(p.sizes) ? p.sizes.map(String) : String(p.sizes || "").split(",").map((s) => s.trim()).filter(Boolean),
        colors: Array.isArray(p.colors) ? p.colors.map(String) : String(p.colors || "").split(",").map((s) => s.trim()).filter(Boolean),
        stock: Math.max(0, Math.floor(Number(p.stock) || 0)),
        image: String(p.image || "img/p-default.svg").slice(0, 300),
        featured: Boolean(p.featured),
      };
      const i = catalog.findIndex((c) => c.id === clean.id);
      if (i >= 0) catalog[i] = clean;
      else catalog.push(clean);
      await blobs.setJSON("catalog", catalog);
      return json(catalog);
    }

    if (body.action === "delete" && body.id) {
      const next = catalog.filter((c) => c.id !== body.id);
      await blobs.setJSON("catalog", next);
      return json(next);
    }

    if (body.action === "reset") {
      // Repart du fichier products.json du site
      await blobs.delete("catalog");
      return json(await loadCatalog(req, blobs));
    }

    return json({ error: "Action inconnue" }, 400);
  }

  return json({ error: "Méthode non autorisée" }, 405);
};
