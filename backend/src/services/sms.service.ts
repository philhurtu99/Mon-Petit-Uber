// Service d'envoi de SMS via Twilio
// Permet d'envoyer le code 2FA par SMS au numéro de téléphone du client
// Mode "console" disponible pour le développement sans utiliser les crédits Twilio
import twilio from "twilio";

// Méthode qui permet d'envoyer un SMS à un numéro de téléphone donné.
// Retourne true si l'envoi a réussi, false sinon.
export const sendSms = async (to: string, message: string): Promise<boolean> => {
  const provider = process.env.SMS_PROVIDER || "console";

  // Mode console : affiche le SMS dans le terminal au lieu de l'envoyer
  // Utile pour tester sans consommer les crédits Twilio
  if (provider === "console") {
    console.log("=== SMS (mode console) ===");
    console.log(`À: ${to}`);
    console.log(`Message: ${message}`);
    console.log("===========================");
    return true;
  }

  // Mode Twilio : envoi réel via l'API Twilio
  if (provider === "twilio") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error("Configuration Twilio manquante dans .env");
      return false;
    }

    try {
      const client = twilio(accountSid, authToken);
      await client.messages.create({
        body: message,
        from: fromNumber,
        to: to,
      });
      return true;
    } catch (error) {
      console.error("Erreur lors de l'envoi du SMS via Twilio:", error);
      return false;
    }
  }

  console.error(`Provider SMS inconnu: ${provider}`);
  return false;
};
