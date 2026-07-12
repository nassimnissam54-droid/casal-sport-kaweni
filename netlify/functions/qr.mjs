/* ============================================================
   /api/qr?data=CS-XXXX-XXXX — génère un QR code PNG.
   Sert à la fois le reçu e-mail du client (image scannable) et
   l'affichage « Mon compte ». Le QR encode le code de retrait ;
   scanné au magasin, il remplit la recherche de commande.

   Image de notre PROPRE domaine : aucune donnée client envoyée à
   un service tiers. QR d'un code donné = toujours identique donc
   mis en cache très longtemps.
   ============================================================ */
import QRCode from 'qrcode';

export default async (req) => {
  const url = new URL(req.url);
  const data = (url.searchParams.get('data') || '').trim();

  // On n'accepte que des codes courts et sûrs (codes de retrait) :
  // évite de transformer l'endpoint en générateur de QR ouvert.
  if (!data || data.length > 64 || !/^[A-Za-z0-9\-]+$/.test(data)) {
    return new Response('Paramètre « data » invalide', { status: 400 });
  }

  try {
    const png = await QRCode.toBuffer(data, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: { dark: '#0A0A0A', light: '#FFFFFF' },
    });
    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error('qr:', e);
    return new Response('Erreur QR', { status: 500 });
  }
};
