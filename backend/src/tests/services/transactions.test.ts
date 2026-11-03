import { prismaMock } from "../prismaMock";
import { getTransactionByUser, getTransactionById, getAllTransactions, createTransaction } from "../../services/transaction.service";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Transaction } from "../../../generated/prisma";
import { sendNewOrderMobileNotification } from "../../services/mobileNotifications.service";

jest.mock("../../services/mobileNotifications.service", () => ({
    sendNewOrderMobileNotification: jest.fn(),
}));

jest.mock("../../services/orderEvents.service", () => ({
    notifyOrderPreparationChanged: jest.fn(),
}));

describe("TransactionServiceTests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    //---------------------------------------------------------------
    // Teste getTransactionByUser quand le Id est invalide
    it("getTransactionByUser_WhenTransactionIdInvalid", async () => {

        // Arrange
        prismaMock.transaction.findUnique.mockResolvedValue(null);

        // Act
        const result = await getTransactionByUser("");

        // Assert
        expect(result).toBeNull();
    });

    //---------------------------------------------------------------
    // Teste getTransactionByUser quand le Id est valide
    it("getTransactionByUser_WhenTransactionIdIsValid", async () => {

        // Arrange
        const userId = "123";
        const purchaseDate = new Date("2026-05-19T14:30:00.000Z");
        const transaction = { 
            id: 1, 
            purchaseDate,
            total: 100, 
            userId: userId,
            commande: {
                id: 5,
                etat: "ANNULEE",
                cancelledAt: new Date("2026-05-19T14:45:00.000Z"),
                cancelReason: "Expiration automatique après 30 minutes",
            },
            items: [
                {
                    price: 25,
                    quantity: 4,
                    product: {
                        id: 10,
                        name: "Produit test",
                        imageUrl: "/images/test.png",
                        stock: 6,
                    },
                },
            ],
        } as any;

        prismaMock.user.findUnique.mockResolvedValue({ id: userId } as any);
        prismaMock.transaction.findMany.mockResolvedValue([transaction]);
        
        // Act
        const result = await getTransactionByUser(userId);

        // Assert
        expect(prismaMock.transaction.findMany).toHaveBeenCalledWith({
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
        expect(result).toEqual([
            {
                id: 1,
                purchaseDate,
                total: 100,
                commandeEtat: "ANNULEE",
                commandeId: 5,
                commande: transaction.commande,
                items: [
                    {
                        id: 10,
                        name: "Produit test",
                        imageUrl: "/images/test.png",
                        price: 25,
                        quantity: 4,
                        lineTotal: 100,
                        stock: 6,
                        existingReview: null,
                    },
                ],
            },
        ]);
    });

    //---------------------------------------------------------------
    // Teste getTransactionById quand il n'y a pas des produits
   it("getTransactionById_WhenIdIsNegatif", async () => {
        
        // Arrange
        const produits = [] as any;
        prismaMock.transaction.findMany.mockResolvedValue(produits);
        const transactionId = -1;

        // Act
        const result = await getTransactionById(transactionId);

        // Assert
         expect(result).toEqual(undefined);
    });

    //---------------------------------------------------------------
    // Teste getTransactionById quand il n'y a pas des produits
     it("getTransactionById_WhenTransactionHaveData", async () => {
        
        // Arrange
        const transactions = [
        {
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
                }]
            }
        ] as any;
        prismaMock.transaction.findUnique.mockResolvedValue(transactions[0] as any);

        // Act
        const result = await getTransactionById(1);

        // Assert
         //expect(result?.items).toHaveLength(1);
         expect(result?.purchaseDate).toEqual("2026-04-08T14:26:50.921Z");
         expect(result?.total).toEqual(70.85);
    });

    //---------------------------------------------------------------
    // Teste getTransactionById quand data est null
   it("getTransactionById_WhenIdIsNegatif", async () => {
        
        // Arrange
        const transactionId = -1;

        // Act
        const result = await getTransactionById(transactionId);

        // Assert
        expect(result).toEqual(undefined);
    });

    //---------------------------------------------------------------
    // Teste getAllTransactions quand le nom est trop court
     it("getAllTransactions_WhenDatabaseIsValid", async () => {

        // Arrange
        const transaction = [
        {
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
                }]
            },
            {
            "id": 2,
            "userId": "cmo3hdr4q00017wnwaq5kzv4v",
            "purchaseDate": "2026-04-18T14:26:50.921Z",
            "total": 80.85,
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
                }]
            }
        ] as any;
        prismaMock.transaction.findMany.mockResolvedValue(transaction as any);

        // Act
        const result = await getAllTransactions();

        // Assert
         await expect((await result).length).toEqual(2);
         await expect((await result)[1]?.total).toEqual(80.85);

    });

    //---------------------------------------------------------------
    // Teste getAllTransactions quand le prix est zero
  it("getAllTransactions_WhenDataBaseIsEmpty", async () => {
        
        // Arrange
        const transactions = [];
        prismaMock.transaction.findMany.mockResolvedValue(transactions);

        // Act
        const result = await getAllTransactions();

        // Assert
         await expect((await result).length).toEqual(0);
    });

  it("createTransaction_WhenCommandeIsCreated_NotifiesSubscribedEmployees", async () => {
    const transaction = {
      id: 12,
      commande: {
        id: 48,
        type: "LIVRAISON",
      },
    } as any;

    prismaMock.transaction.create.mockResolvedValue(transaction);
    (sendNewOrderMobileNotification as jest.Mock<any>).mockResolvedValue({
      sent: 1,
      failed: 0,
    });

    await createTransaction({
      userId: "client_1",
      stripeSessionId: "sess_12",
      stripePaymentId: "pi_12",
      total: 24,
      items: [{ productId: 7, quantity: 2, price: 12 }],
    });

    expect(prismaMock.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          commande: {
            select: {
              id: true,
              type: true,
              expiresAt: true,
            },
          },
        },
      }),
    );
    expect(sendNewOrderMobileNotification).toHaveBeenCalledWith({
      id: 48,
      type: "LIVRAISON",
    });
  });
});
    
