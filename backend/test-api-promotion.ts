/**
 * Script de test pour vérifier l'API /cartWithPromotions
 * Exécutez avec: npx ts-node test-api-promotion.ts
 */

const API_URL = "http://localhost:5000";

async function testCartAPI() {
  try {
    const cookieJar: string[] = [];

    // Helper pour extraire les cookies
    function extractCookies(headers: Headers): void {
      const setCookie = headers.get("set-cookie");
      if (setCookie && typeof setCookie === "string") {
        cookieJar.push(setCookie.split(";")[0]!);
      }
    }

    // Helper pour envoyer les cookies
    function getCookieHeader(): string {
      return cookieJar.join("; ");
    }

    // 1. Ajouter un produit au panier (3x Chandail noir qui a une promo "2 pour 1")
    let res = await fetch(`${API_URL}/api/cart/addToCart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: getCookieHeader(),
      },
      body: JSON.stringify({
        productId: 1, // Chandail noir
        quantity: 3,
      }),
    });

    extractCookies(res.headers);

    if (!res.ok) {
      console.error("Erreur:", await res.text());
      return;
    }

    let data = await res.json();

    // 2. Récupérer le panier avec les promotions
    res = await fetch(`${API_URL}/api/cart/cartWithPromotions`, {
      headers: {
        Cookie: getCookieHeader(),
      },
    });

    extractCookies(res.headers);
    data = await res.json();

    // Vérifier les calculs
    if (data.items && data.items.length > 0) {
      const item = data.items[0];

      // Vérification mathématique
      const expectedTotal = 29.99 * 2; // 2 articles payés
      if (Math.abs(item.finalTotal - expectedTotal) < 0.01) {
      } else {
      }
    }
  } catch (err) {
    console.error("❌ Erreur:", err);
  }
}

// Attendre que le serveur soit prêt
setTimeout(testCartAPI, 2000);
