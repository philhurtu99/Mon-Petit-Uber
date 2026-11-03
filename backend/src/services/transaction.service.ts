import { prisma } from "../lib/prisma";
import { notifyOrderPreparationChanged } from "./orderEvents.service";
import { scheduleOrderExpiration } from "./orderExpiration.service";
import { getOrderExpirationMs } from "../config/order.config";
import { sendNewOrderMobileNotification } from "./mobileNotifications.service";

export type FulfillmentMode = "livraison" | "ramassage";

/** ---------------------------------------------------------------------
 * Retourne toutes les transactions d'un utilisateur donné
 * @param userId - ID de l'utilisateur
 * @returns - Liste des transactions de l'utilisateur en incluant les produits et par ordre decroissant de la date d'achat ou null si non trouvé
 * 
 * purchaseDate               | nom produit             | prix  | quantité  | total
 * ___________________________________________________________________________________
 * 2026-04-08T18:26:50.921Z   | image1 | Frites congélées        | 4.29  | 3         | 
 *                            | image2 | Livre de mathématiques  | 28.99 | 2         | 
 *                                                                                   | 70.85
 * 
 -------------------------------------------------------------------------------------
 /** 
 *    {
        "id": 1,
        "userId": "cmo3hdr4q00017wnwaq5kzv4v",
        "purchaseDate": "2026-04-08T14:26:50.921Z",
        "total": 70.85,
        "items": [
            {
                "id": 1,
                "transactionId": 1,
                "productId": 63,
                "quantity": 3,
                "price": 4.29,
                "product": {
                    "id": 63,
                    "name": "Frites congelées",
                    "description": "750g",
                    "imageUrl": "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
                    "price": 4.99,
                    "sale": 4.29,
                    "idle": false,
                    "stock": 22,
                    "categoryId": 3
                }
            }
        }
 */
export const getTransactionByUser = async (userId: string) => {

  // vérification de l'existence de l'utilisateur
  const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

  let transactions =  await prisma.transaction.findMany({ 
    where: { userId: userId },
    include: {
      commande: {
        select: {
          id: true,
          etat: true,
          cancelledAt: true,
          cancelReason: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              stock: true,
            },
          },
        },
      },
    },
    orderBy: {
      purchaseDate: "desc",
    },
  });
   
  return Promise.all(transactions.map(async (t) => ({
    id: t.id,
    purchaseDate: t.purchaseDate,
    total: t.total,
    commandeEtat: t.commande?.etat ?? null,
    commandeId: t.commande?.id ?? null,
    commande: t.commande,
    items: await Promise.all(t.items.map(async (item) => {
      const existingReview = await prisma.productReview.findUnique({
        where: { userId_productId: { userId, productId: item.product.id } },
        select: { id: true, rating: true, comment: true,imagesUrl: true }
      });

      return {
        id: item.product.id,
        name: item.product.name,
        imageUrl: item.product.imageUrl,
        price: item.price,
        quantity: item.quantity,
        lineTotal: item.price * item.quantity,
        stock: item.product.stock,
        existingReview: existingReview ?? null,
      };
    })),
  })));
};

/** ---------------------------------------------------------------------
 * Retourne une transaction par son ID
 * @param id - ID de la transaction
 * @returns - La transaction trouvée ou null si non trouvé
 ---------------------------------------------------------------------*/
export const getTransactionById = async (id: number) => {
  return await prisma.transaction.findUnique({
    where: { id },
    include: { commande: true },
  });
};

/** ---------------------------------------------------------------------
 * Retourne toutes les transactions
 * @returns - Liste de toutes les transactions
 ---------------------------------------------------------------------*/
export const getAllTransactions = async () => {
  const transactions = await prisma.transaction.findMany();
  return transactions;
};

/** ---------------------------------------------------------------------
 * Crée une transaction
 * @param params - Paramètres de la transaction
 * @returns - La transaction créée
 ---------------------------------------------------------------------*/
/** ---------------------------------------------------------------------
 * Retourne une transaction par son stripeSessionId (ou null)
 ---------------------------------------------------------------------*/
export const findTransactionByStripeSession = async (sessionId: string) => {
  return await prisma.transaction.findFirst({
    where: { stripeSessionId: sessionId },
  });
};

// Enregistre la transaction finalisée avec creditUsed et stripeAmountPaid.
// Ces valeurs viennent de finalizeCheckout après confirmation de la session Stripe.
export const createTransaction = async (params: {
  userId: string;
  stripeSessionId: string;
  stripePaymentId: string | null;
  total: number;
  creditUsed?: number;
  loyaltyPointsUsed?: number;
  loyaltyDiscount?: number;
  stripeAmountPaid?: number;
  fulfillmentMode?: FulfillmentMode;
  local?: string;
  items: { productId: number; quantity: number; price: number }[];
}) => {
  const fulfillmentMode = params.fulfillmentMode ?? "livraison";
  const commandeType = fulfillmentMode === "livraison" ? "LIVRAISON" : "PICKUP";
  const expiresAt = new Date(Date.now() + getOrderExpirationMs());

  const transaction = (await prisma.transaction.create({
    data: {
      userId: params.userId,
      purchaseDate: new Date(),
      total: params.total,
      stripeSessionId: params.stripeSessionId,
      stripePaymentId: params.stripePaymentId,
      paidAt: new Date(),
      creditUsed: params.creditUsed ?? 0,
      loyaltyPointsUsed: params.loyaltyPointsUsed ?? 0,
      loyaltyDiscount: params.loyaltyDiscount ?? 0,
      stripeAmountPaid: params.stripeAmountPaid ?? 0,
      items: {
        create: params.items,
      },
      commande: {
        create: {
          type: commandeType,
          ...(commandeType === "LIVRAISON"
            ? { local: params.local ?? null }
            : {}),
          etat: "EN_PREPARATION",
          codeConfirmation: Math.floor(1000 + Math.random() * 9000).toString(),
          expiresAt,
        },
      },
    },
    include: {
      commande: {
        select: {
          id: true,
          type: true,
          expiresAt: true,
        },
      },
    },
  })) as any;

  if (transaction.commande?.expiresAt) {
    scheduleOrderExpiration(
      transaction.commande.id,
      transaction.commande.expiresAt,
    );
  }

  notifyOrderPreparationChanged();

  if (transaction.commande) {
    void sendNewOrderMobileNotification(transaction.commande).catch((error) => {
      console.error("Erreur notification nouvelle commande:", error);
    });
  }

  return transaction;
};
