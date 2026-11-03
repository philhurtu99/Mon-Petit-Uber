import { prisma } from "../lib/prisma";
import { capLoyaltyPoints, getLoyaltyPointsUntilCap } from "./loyalty.service";
import { LOYALTY_MAX_POINTS } from "../config/loyalty.config";
import { roundAdminLoyaltyPointsDelta } from "../utils/loyaltyPoints";

export type HabitPeriod = "day" | "month";

/**
 * Classe d'erreur personnalisée pour les limites de points de fidélité
 * @param maxAddablePoints - Nombre maximum de points ajoutables
 */
export class LoyaltyPointsLimitError extends Error {
  constructor(maxAddablePoints: number) {
    super(
      maxAddablePoints > 0
        ? `Impossible d'ajouter plus de ${maxAddablePoints.toLocaleString("fr-CA")} points à ce client.`
        : `Ce client a déjà atteint le maximum de ${LOYALTY_MAX_POINTS.toLocaleString("fr-CA")} points.`,
    );
    this.name = "LoyaltyPointsLimitError";
  }
}

/**
 * Arrondit un montant à 2 décimales
 * @param value - Montant à arrondir
 * @returns montant arrondi
 */
const roundMoney = (value: number) => {
  return Math.round(value * 100) / 100;
};

/**
 * Formate une date selon la période demandée
 * @param date - Date de la transaction
 * @param period - "day" ou "month"
 * @returns clé de regroupement
 */
const formatHabitKey = (date: Date, period: HabitPeriod) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  if (period == "month") return `${year}-${month}`;

  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** ---------------------------------------------------------------------
 * Protège les valeurs CSV contre les virgules, guillemets et retours de ligne
 * @param value - Valeur à convertir
 * @returns valeur prête pour CSV
 ---------------------------------------------------------------------*/
const escapeCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return "";

  const stringValue =
    value instanceof Date ? value.toISOString() : String(value);

  return `"${stringValue.replace(/"/g, '""')}"`;
};

/**
 * Retourne tous les clients avec un résumé d'achat
 * Les clients sont triés par nombre de commandes décroissant
 * @returns liste des clients avec nombre d'achats et total dépensé
 */
export const getAdminClients = async () => {
  const clients = await prisma.user.findMany({
    where: {
      role: "user",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      profilePicture: true,
      createdAt: true,
      loyaltyPoints: true,
      transactions: {
        select: {
          id: true,
          total: true,
          purchaseDate: true,
        },
      },
    },
  });

  return clients
    .map((client) => {
      const ordersCount = client.transactions.length;
      const totalSpent = client.transactions.reduce(
        (sum, transaction) => sum + transaction.total,
        0,
      );

      const lastPurchaseDate =
        client.transactions.length > 0
          ? client.transactions
              .map((transaction) => transaction.purchaseDate)
              .sort((a, b) => b.getTime() - a.getTime())[0]
          : null;

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        profilePicture: client.profilePicture,
        createdAt: client.createdAt,
        loyaltyPoints: client.loyaltyPoints,
        ordersCount,
        totalSpent: roundMoney(totalSpent),
        lastPurchaseDate,
      };
    })
    .sort((a, b) => {
      if (b.ordersCount !== a.ordersCount) {
        return b.ordersCount - a.ordersCount;
      }

      return b.totalSpent - a.totalSpent;
    });
};

/** ---------------------------------------------------------------------
 * Retourne les détails complets d'un client
 * Inclut les informations personnelles, le nombre de commandes et la liste des commandes
 * @param clientId - ID du client
 * @returns fiche complète du client ou null si introuvable
 ---------------------------------------------------------------------*/
export const getAdminClientDetails = async (clientId: string) => {
  const client = await prisma.user.findUnique({
    where: {
      id: clientId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      profilePicture: true,
      creditBalance: true,
      loyaltyPoints: true,
      createdAt: true,
      updatedAt: true,
      transactions: {
        orderBy: {
          purchaseDate: "desc",
        },
        select: {
          id: true,
          purchaseDate: true,
          total: true,
          creditUsed: true,
          loyaltyPointsUsed: true,
          loyaltyDiscount: true,
          loyaltyPointsEarned: true,
          stripeAmountPaid: true,
          commande: {
            select: {
              id: true,
              type: true,
              etat: true,
              createdAt: true,
              updatedAt: true,
              readyForPickupAt: true,
              deliveryPickedUpAt: true,
            },
          },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!client) return null;

  const ordersCount = client.transactions.length;
  const totalSpent = client.transactions.reduce(
    (sum, transaction) => sum + transaction.total,
    0,
  );

  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    phone: client.phone,
    address: client.address,
    profilePicture: client.profilePicture,
    creditBalance: client.creditBalance,
    loyaltyPoints: client.loyaltyPoints,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
    ordersCount,
    totalSpent: roundMoney(totalSpent),
    orders: client.transactions.map((transaction) => ({
      id: transaction.id,
      purchaseDate: transaction.purchaseDate,
      total: transaction.total,
      creditUsed: transaction.creditUsed,
      loyaltyPointsUsed: transaction.loyaltyPointsUsed,
      loyaltyDiscount: transaction.loyaltyDiscount,
      loyaltyPointsEarned: transaction.loyaltyPointsEarned,
      stripeAmountPaid: transaction.stripeAmountPaid,
      commande: transaction.commande,
      items: transaction.items.map((item) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        price: item.price,
        lineTotal: roundMoney(item.price * item.quantity),
      })),
    })),
  };
};

/* Ajuste les points de fidélité d'un client administrateur.
 * Retourne les points ajustés ou null si le client n'existe pas ou n'est pas un utilisateur.
 */
export const adjustAdminClientLoyaltyPoints = async (
  clientId: string,
  pointsDelta: number,
) => {
  const roundedPointsDelta = roundAdminLoyaltyPointsDelta(pointsDelta);

  // Recherche le client par ID et sélectionne les champs nécessaires.
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, role: true, loyaltyPoints: true },
  });

  if (!client || client.role !== "user") return null;

  const maxAddablePoints = getLoyaltyPointsUntilCap(client.loyaltyPoints);
  if (roundedPointsDelta > maxAddablePoints) {
    throw new LoyaltyPointsLimitError(maxAddablePoints);
  }

  // Calcule les nouveaux points en s'assurant qu'ils restent dans la limite permise.
  const nextPoints = capLoyaltyPoints(
    client.loyaltyPoints + roundedPointsDelta,
  );

  return await prisma.user.update({
    where: { id: clientId },
    data: { loyaltyPoints: nextPoints },
    select: {
      id: true,
      loyaltyPoints: true,
    },
  });
};

/** ---------------------------------------------------------------------
 * Retourne les habitudes d'achat d'un client par jour ou par mois
 * @param clientId - ID du client
 * @param period - période de regroupement: "day" ou "month"
 * @returns habitudes d'achat ou null si client introuvable
 ---------------------------------------------------------------------*/
export const getAdminClientHabits = async (
  clientId: string,
  period: HabitPeriod = "month",
) => {
  const client = await prisma.user.findUnique({
    where: {
      id: clientId,
    },
    select: {
      id: true,
      transactions: {
        select: {
          id: true,
          total: true,
          purchaseDate: true,
          items: {
            select: {
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!client) return null;

  const habitsMap = new Map<
    string,
    {
      period: string;
      ordersCount: number;
      itemsCount: number;
      totalSpent: number;
    }
  >();

  for (const transaction of client.transactions) {
    const key = formatHabitKey(transaction.purchaseDate, period);

    const current = habitsMap.get(key) ?? {
      period: key,
      ordersCount: 0,
      itemsCount: 0,
      totalSpent: 0,
    };

    current.ordersCount += 1;
    current.totalSpent += transaction.total;
    current.itemsCount += transaction.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    habitsMap.set(key, current);
  }

  return [...habitsMap.values()]
    .map((habit) => ({
      ...habit,
      totalSpent: roundMoney(habit.totalSpent),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
};

/** ---------------------------------------------------------------------
 * Retourne les fiches clients complètes pour l'export JSON
 * @returns fiches clients détaillées
 ---------------------------------------------------------------------*/
export const getAdminClientsExportJson = async () => {
  const clients = await getAdminClients();

  const detailedClients = await Promise.all(
    clients.map((client) => getAdminClientDetails(client.id)),
  );

  return detailedClients.filter((client) => client !== null);
};

/** ---------------------------------------------------------------------
 * Retourne les fiches clients en format CSV
 * @returns contenu CSV
 ---------------------------------------------------------------------*/
export const getAdminClientsExportCsv = async () => {
  const clients = await getAdminClients();

  const headers = [
    "id",
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "createdAt",
    "loyaltyPoints",
    "ordersCount",
    "totalSpent",
    "lastPurchaseDate",
  ];

  const rows = clients.map((client) =>
    [
      client.id,
      client.firstName,
      client.lastName,
      client.email,
      client.phone,
      client.address,
      client.createdAt,
      client.loyaltyPoints,
      client.ordersCount,
      client.totalSpent,
      client.lastPurchaseDate,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
};
