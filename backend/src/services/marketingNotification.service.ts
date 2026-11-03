import { getRequiredEnv } from "../utils/env";
// ============================================================
//  SERVICE D'ENVOI DE NOTIFICATIONS MARKETING
// ============================================================
// RÔLE :
// Envoie un email (via Brevo) ou un SMS (via Twilio) à tous les 
// utilisateurs qui ont consenti à recevoir des offres promotionnelles,
// selon leur méthode préférée.
//
// Réutilise :
// - Le service sendSms existant (avec mode console)
// - Le pattern Brevo via fetch (comme dans auth.controller.ts)
//
// ============================================================

import { prisma } from "../lib/prisma";
import { sendSms } from "./sms.service";


// Type d'une promotion enrichie (avec les produits)
interface PromotionForNotification {
  id: number;
  name: string;
  description: string | null;
  type: "BUY_X_GET_Y" | "FREE_ITEM";
  quantity: number | null;
  bonusQuantity: number | null;
  endDate: Date;
  targetProduct: { id: number; name: string } | null;
  bonusProduct: { id: number; name: string } | null;
}


// Construit le message à envoyer (commun EMAIL et SMS, version texte)
const buildPromotionMessage = (promo: PromotionForNotification): {
  subject: string;
  textShort: string;   // pour SMS (limite ~160 caractères)
  textLong: string;    // pour email (HTML)
} => {
  const targetName = promo.targetProduct?.name || "un produit";
  const bonusName = promo.bonusProduct?.name || "un produit bonus";
  const endDateStr = new Date(promo.endDate).toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let descriptionLine = "";
  if (promo.type === "BUY_X_GET_Y" && promo.quantity && promo.bonusQuantity) {
    descriptionLine = `Achetez ${promo.quantity} ${targetName}, obtenez ${promo.bonusQuantity} ${bonusName}.`;
  } else if (promo.type === "FREE_ITEM") {
    descriptionLine = `${bonusName} GRATUIT à l'achat de ${targetName} !`;
  } else {
    descriptionLine = promo.description || `Profitez de notre nouvelle offre sur ${targetName}.`;
  }

  // SMS : court et clair
  const textShort = `Mon Petit Uber - Nouvelle offre ! ${promo.name}. ${descriptionLine} Valable jusqu'au ${endDateStr}.`;

  // EMAIL : plus long, en HTML
  const textLong = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2 style="color: #8DC640;">Nouvelle promotion chez Mon Petit Uber !</h2>
      <h3>${promo.name}</h3>
      <p>${descriptionLine}</p>
      ${promo.description ? `<p>${promo.description}</p>` : ""}
      <p><strong>Valable jusqu'au ${endDateStr}</strong></p>
      <hr/>
      <p style="font-size: 12px; color: #666;">
        Vous recevez ce courriel parce que vous avez accepté de recevoir 
        nos offres promotionnelles. Vous pouvez modifier vos préférences 
        à tout moment depuis votre profil.
      </p>
    </div>
  `;

  return {
    subject: `Nouvelle promotion : ${promo.name}`,
    textShort,
    textLong,
  };
};


// Envoie un email via l'API Brevo
const sendMarketingEmail = async (
  to: string,
  subject: string,
  htmlContent: string,
): Promise<boolean> => {
  // Mode console pour développement (si SMS_PROVIDER=console, on suppose qu'on développe)
  const mode = process.env.SMS_PROVIDER || "console";
  if (mode === "console") {
    console.log("=== EMAIL MARKETING (mode console) ===");
    console.log(`À: ${to}`);
    console.log(`Sujet: ${subject}`);
    console.log(`(Contenu HTML non affiché)`);
    console.log("=====================================");
    return true;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key":
          getRequiredEnv("BREVO_API_KEY"),
       
      },
      body: JSON.stringify({
        sender: { name: "MonPetitUber", email: getRequiredEnv("MAIL_FROM_EMAIL") },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error(
        `Échec envoi email marketing à ${to} : statut ${response.status}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Erreur réseau envoi email marketing à ${to} :`, error);
    return false;
  }
};


// Fonction principale exportée :
// Récupère les users avec consentement, envoie selon leur méthode préférée.
//
// Modes de fonctionnement :
// - Pas de paramètre : envoie à tous les users consentants
// - Avec userIds : envoie uniquement à ces users (utile pour les tests)
//
// Cette fonction est "non-bloquante" pour l'appelant : les erreurs d'envoi 
// individuelles sont loggées mais ne font pas planter la promotion.
export const notifyConsentingUsers = async (
  promotion: PromotionForNotification,
  userIds?: string[],
): Promise<{ totalSent: number; totalFailed: number; totalSkipped: number }> => {
  const result = { totalSent: 0, totalFailed: 0, totalSkipped: 0 };

  // Récupérer les utilisateurs consentants
  const users = await prisma.user.findMany({
    where: {
      marketingConsent: true,
      ...(userIds ? { id: { in: userIds } } : {}),
    },
    select: {
      id: true,
      email: true,
      phone: true,
      marketingMethod: true,
      firstName: true,
    },
  });

  if (users.length === 0) {
    console.log("Aucun utilisateur consentant à notifier pour cette promotion.");
    return result;
  }

  console.log(
    `Notification de ${users.length} utilisateur(s) consentant(s) pour la promotion "${promotion.name}"`,
  );

  const message = buildPromotionMessage(promotion);

  // Envoyer à chacun selon sa préférence
  for (const user of users) {
    if (user.marketingMethod === "EMAIL") {
      const ok = await sendMarketingEmail(
        user.email,
        message.subject,
        message.textLong,
      );
      if (ok) result.totalSent++;
      else result.totalFailed++;
    } else if (user.marketingMethod === "SMS") {
      if (!user.phone) {
        // Méthode SMS mais pas de téléphone : on saute
        console.warn(
          `User ${user.id} : SMS choisi mais pas de numéro de téléphone, saut`,
        );
        result.totalSkipped++;
        continue;
      }

      // Format E.164 attendu par Twilio (doit commencer par +)
      // Si le numéro est au format 555-0001 ou 5550001, on le convertit
      let phoneE164 = user.phone.replace(/\D/g, "");
      if (!phoneE164.startsWith("+")) {
        if (phoneE164.length === 10) {
          phoneE164 = "+1" + phoneE164;
        } else if (phoneE164.length === 11 && phoneE164.startsWith("1")) {
          phoneE164 = "+" + phoneE164;
        } else {
          console.warn(
            `User ${user.id} : numéro invalide (${user.phone}), saut`,
          );
          result.totalSkipped++;
          continue;
        }
      }

      const ok = await sendSms(phoneE164, message.textShort);
      if (ok) result.totalSent++;
      else result.totalFailed++;
    } else {
      // Méthode null (cas impossible avec consent=true normalement) : on saute
      result.totalSkipped++;
    }
  }

  console.log(
    `Notifications terminées : ${result.totalSent} envoyés, ${result.totalFailed} échecs, ${result.totalSkipped} sautés`,
  );
  return result;
};
