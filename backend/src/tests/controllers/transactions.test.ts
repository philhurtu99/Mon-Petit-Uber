import { prismaMock } from "../prismaMock";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import * as transactionService from "../../services/transaction.service";
import {  getAll, getById, getAllForUser } from "../../controllers/transactions.controller";

jest.mock("../../services/transaction.service");
jest.mock("bcrypt");

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockImplementation(async () => true),
  }),
}));

// Setup de base (Similaire au constructeur en C#)
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  (req as any).session = {};
  next();
});

const mockUser = {
  id: "cmo3hdr4q00017wnwaq5kzv4v",
  firstName: "Rodrigo",
  lastName: "Ortega",
  email: "roro@example.com",
  emailVerifiedAt: new Date(),
  password: null,
  googleId: null,
  address: "309 ch chambly",
  phone: "5148674413",
  profilePicture: "/uploads/profiles/avatar.jpg",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTransaction  = [
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

  const newTransactionBody = {
    "id": 3,
    "userId": "cmo3hdr4q00017wnwaq5kzv4v",
    "purchaseDate": "2026-04-19T14:26:50.921Z",
    "total": 90.85,
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


app.get("/transaction/getAll", getAll);
app.get("/transaction/getById/:id", getById);
app.get("/transaction/getAllForUser/:id", getAllForUser);
app.get("/transaction/getAllForUser", getAllForUser);

describe("TransactionControllerTests", () => {

  //---------------------------------------------------------------
    // Teste getAll quand le produits sont valides
    it("getAll_WhenTransactionsAreValid", async () => {

      // Arrange
      (transactionService.getAllTransactions as jest.Mock<never>).mockResolvedValue(mockTransaction);

      // Act
      const response = await request(app).get("/transaction/getAll");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTransaction);
      expect(transactionService.getAllTransactions).toHaveBeenCalled();
    });

    //---------------------------------------------------------------
    // Teste getAll quand le produits sont invalides/erreur
    it("getAll_WhenTransactionAreInvalid_500", async () => {
        
    // Arrange
      const mockedGetAllProducts = transactionService.getAllTransactions as jest.MockedFunction<typeof transactionService.getAllTransactions>;
      mockedGetAllProducts.mockRejectedValue(new Error("DB error"));

      // Act
      const response = await request(app).get("/transaction/getAll");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: "Erreur lors de la récupération des transactions" });
    });

     //---------------------------------------------------------------
    // Teste getById quand le produit existe
    it("getById_WhenTransactionExists", async () => {
        // Arrange
        (transactionService.getTransactionById as jest.MockedFunction<typeof transactionService.getTransactionById>)
          .mockResolvedValue(mockTransaction as any);

        // Act
        const response = await request(app).get("/transaction/getById/1");

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockTransaction);
        expect(transactionService.getTransactionById).toHaveBeenCalledWith(1);
      });

      //---------------------------------------------------------------
    // Teste getById quand le produit n'existe pas
  it("getById_WhenTransactionNotFound_404", async () => {
    // Arrange
    (transactionService.getTransactionById as jest.MockedFunction<typeof transactionService.getTransactionById>)
      .mockResolvedValue(null as any);

    // Act
    const response = await request(app).get("/transaction/getById/999");

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Transaction non trouvée" });
  });
    
   //---------------------------------------------------------------
    // Teste getById quand le service retourne une erreur
 it("getById_WhenServiceThrows_500", async () => {
    // Arrange
    (transactionService.getTransactionById as jest.MockedFunction<typeof transactionService.getTransactionById>)
      .mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/transaction/getById/1");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur lors de la récupération de la transaction" });
  });

   //---------------------------------------------------------------
  // Teste getAllForUser quand les données sont valides
  it("getAllForUser_WhenDataIsValid", async () => {
    // Arrange
    (transactionService.getTransactionByUser as jest.MockedFunction<typeof transactionService.getTransactionByUser>)
      .mockResolvedValue(mockTransaction);

    // Act
    const response = await request(app).get(`/transaction/getAllForUser/${mockUser.id}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockTransaction);
    expect(transactionService.getTransactionByUser).toHaveBeenCalled();  
  });

  //---------------------------------------------------------------
  // Teste getAllByUser quand le service retourne une erreur
  it("getAllByUser_WhenServiceThrowsError_400", async () => {
      
    // Act
    const response = await request(app).get("/transaction/getAllForUser");

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "ID utilisateur manquant" });
  });

  //---------------------------------------------------------------
  // Teste getAllByUser si aucune transaction trouvée
 it("getAllByUser_WhenServiceThrowsError_404 ", async () => {
    (transactionService.getTransactionByUser as jest.MockedFunction<typeof transactionService.getTransactionByUser>).mockResolvedValue(null);

    const res = await request(app).get(`/transaction/getAllForUser/${mockUser.id}`);

    expect((transactionService.getTransactionByUser as jest.MockedFunction<typeof transactionService.getTransactionByUser>)).toHaveBeenCalledWith(mockUser.id);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Utilisateur non trouvées"});
  });

  //---------------------------------------------------------------
  // Teste getAllByUser quand le service retourne une erreur
  it("getAllByUser_WhenServiceThrowsError_500", async () => {
    // Arrange
    (transactionService.getTransactionByUser as jest.MockedFunction<typeof transactionService.getTransactionByUser>)
      .mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get(`/transaction/getAllForUser/${mockUser.id}`);

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur lors de la récupération des transactions de l'utilisateur" });
  });

});