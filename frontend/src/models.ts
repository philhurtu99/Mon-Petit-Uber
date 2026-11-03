export interface Product {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  stock: number;
  finalPrice: number;
  sale: number;
  idle: boolean;
  isCooked: boolean;
  category: string;
  categoryColor: string;
  categoryId: number;
  productReviews?: ProductReview[];
}
export interface ProductReview {
  id: number;
  rating: number;
  comment: string | null;
  imagesUrl: string[];
  isFlagged?: boolean;
  flagCount?: number;
  reportCount?: number;
  isActive?: boolean;
  createdAt: string;
  productId: number;
  userId: string;
  user: ReviewUser;
}
export interface ReviewUser {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
}
export interface ProductReviewStats {
  average: number;
  total: number;
  distribution: RatingDistribution[];
}

export interface RatingDistribution {
  rating: number;
  count: number;
}

export interface ProductReviewsResponse {
  reviews: ProductReview[];
  stats: ProductReviewStats;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  profilePicture?: string;
  address?: string;
  phone?: string;
  role: string;
  profanityFilterEnabled?: boolean;
}

export type DateRange = {
  from: Date;
  to: Date;
} | null;

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface TransactionItemDTO {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
  lineTotal: number;
  stock: number;
  isCooked?: boolean;
  existingReview: {
    id: number;
    rating: number;
    comment: string | null;
    imagesUrl: string[];
  } | null;
}

export interface TransactionDTO {
  id: number;
  purchaseDate: string;
  total: number;
  commandeEtat?: CommandeEtat | null;
  commandeId?: number | null;
  items: TransactionItemDTO[];
  commande?: {
    etat: CommandeEtat;
    cancelledAt?: string | Date | null;
    cancelReason?: string | null;
  } | null;
}

export type Step = {
  label: string;
  time: number;
};
export interface Commande {
  id: number;
  type: CommandeType;
  local?: string | null;
  transactionId: number;
  transaction?: TransactionDTO;
  etat: CommandeEtat;
  livreurId?: string | null;
  livreur?: User | null;
  preparateurId?: string | null;
  preparateur?: User | null;
  codeConfirmation?: string | null;
  readyForPickupAt?: Date | null;
  deliveryPickedUpAt?: Date | null;
  expiresAt?: string | Date | null;
  cancelledAt?: string | Date | null;
  cancelReason?: string | null;
  preparationTimerLimitMs?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export const CommandeType = {
  LIVRAISON: "LIVRAISON",
  PICKUP: "PICKUP",
} as const;
export type CommandeType = (typeof CommandeType)[keyof typeof CommandeType];

export const CommandeEtat = {
  EN_PREPARATION: "EN_PREPARATION",
  READY_FOR_PICKUP: "READY_FOR_PICKUP",
  READY_FOR_DELIVERY: "READY_FOR_DELIVERY",
  IN_DELIVERY: "IN_DELIVERY",
  COMPLETEE: "COMPLETEE",
  ANNULEE: "ANNULEE",
} as const;
export type CommandeEtat = (typeof CommandeEtat)[keyof typeof CommandeEtat];
export type FaqCategory = "LIVRAISON" | "PAIEMENT" | "MENU" | "AUTRE";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: FaqCategory;
  createdAt: string;
  updatedAt: string;
}

export interface AdminClientSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  profilePicture: string | null;
  createdAt: string;
  loyaltyPoints: number;
  ordersCount: number;
  totalSpent: number;
  lastPurchaseDate: string | null;
}

export interface AdminClientItem {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
}

export interface AdminClientCommande {
  id: number;
  type: string;
  local?: string | null;
  etat: string;
  createdAt: string;
  updatedAt: string;
  readyForPickupAt: string | null;
  deliveryPickedUpAt: string | null;
}

export interface AdminClientOrder {
  id: number;
  purchaseDate: string;
  total: number;
  creditUsed: number;
  loyaltyPointsUsed: number;
  loyaltyDiscount: number;
  loyaltyPointsEarned: number;
  stripeAmountPaid: number;
  commande: AdminClientCommande | null;
  items: AdminClientItem[];
}

export interface AdminClientDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  profilePicture: string | null;
  creditBalance: number;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
  ordersCount: number;
  totalSpent: number;
  orders: AdminClientOrder[];
}

export interface AdminClientHabit {
  period: string;
  ordersCount: number;
  itemsCount: number;
  totalSpent: number;
}
// DTO utilisé pour afficher l'informations des commandes pour l'administrateur
export interface CommandeHistoryDTO {
  id: number;
  type: string;
  local?: string | null;
  etat: string;
  createdAt: Date;
  updatedAt: Date;
  readyForPickupAt: Date | null;
  deliveryPickedUpAt: Date | null;
  codeConfirmation?: string | null;

  // CLIENT
  client: {
    id: string;
    name: string | null;
    email?: string | null;
  };

  // LIVREUR
  livreur: {
    id: string;
    name: string | null;
  } | null;

  // ITEMS
  items: {
    id: number;
    imageUrl: string;
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }[];

  // 📊 META
  itemsCount: number;
  total: number;
};

// Dtos pour livreur dashbord
//---------------------------
export interface DeliveryItem {
  orderId: number;
  date: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  durationMinutes: number | null;
  rating: number | null;
}

export interface DashboardStats {
  totalOrders: number;
  totalReviews: number;
  averageRating: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
}

export interface DashboardData {
  stats: DashboardStats;
  deliveries: DeliveryItem[];
}

//--------------------------------
