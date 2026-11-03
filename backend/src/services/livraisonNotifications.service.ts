import { getRequiredEnv } from "../utils/env";
import { getLivraisonAvailability } from "./livraison.service";

type LivraisonNotificationSubscriber = {
  userId: string;
  email: string;
  name?: string;
  expiresAt: number;
};

const subscribers = new Map<string, LivraisonNotificationSubscriber>();
let isSendingNotifications = false;
let lastAvailableCount = 0;
const SUBSCRIPTION_DURATION_MS = 60 * 60 * 1000;

function getBrevoApiKey() {
  return (
    getRequiredEnv("BREVO_API_KEY")
  );
}

async function sendDeliveryReadyEmail(
  subscriber: LivraisonNotificationSubscriber,
) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": getBrevoApiKey(),
    },
    body: JSON.stringify({
      sender: { name: "MonPetitUber", email: getRequiredEnv("MAIL_FROM_EMAIL") },
      to: [{ email: subscriber.email, name: subscriber.name }],
      subject: "Une commande est prête pour livraison",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 12px; text-align: center; background-color: #fbfbfb;">
          <h2 style="color: #2c3e50;">Commande prête pour livraison</h2>
          <p style="color: #555; font-size: 16px; margin-bottom: 25px;">
            Une commande vient de passer en disponibilité pour livraison. Vous pouvez retourner dans votre espace livreur pour la demander.
          </p>
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/livraison?source=email" style="display: inline-block; padding: 14px 28px; background-color: #8DC640; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 16px;">
            Voir les livraisons
          </a>
        </div>`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Erreur Brevo notification livraison:", errorData);
  }
}

export function subscribeToDeliveryReadyEmail(
  subscriber: Omit<LivraisonNotificationSubscriber, "expiresAt">,
) {
  const alreadySubscribed = isSubscribedToDeliveryReadyEmail(subscriber.userId);
  subscribers.set(subscriber.userId, {
    ...subscriber,
    expiresAt: Date.now() + SUBSCRIPTION_DURATION_MS,
  });
  lastAvailableCount = 0;

  return { alreadySubscribed };
}

export function isSubscribedToDeliveryReadyEmail(userId: string) {
  const subscriber = subscribers.get(userId);

  if (!subscriber) return false;

  if (subscriber.expiresAt <= Date.now()) {
    subscribers.delete(userId);
    return false;
  }

  return true;
}

export async function notifyDeliveryReadyEmailSubscribers() {
  if (isSendingNotifications || subscribers.size === 0) return;

  isSendingNotifications = true;

  try {
    const availability = await getLivraisonAvailability();
    const now = Date.now();

    for (const [userId, subscriber] of subscribers) {
      if (subscriber.expiresAt <= now) {
        subscribers.delete(userId);
      }
    }

    const shouldNotify =
      availability.available && availability.count > lastAvailableCount;
    lastAvailableCount = availability.count;

    if (!shouldNotify || subscribers.size === 0) return;

    await Promise.all(
      Array.from(subscribers.values()).map((subscriber) =>
        sendDeliveryReadyEmail(subscriber),
      ),
    );
  } catch (error) {
    console.error("Erreur notification email livraison:", error);
  } finally {
    isSendingNotifications = false;
  }
}
