import { prismaMock } from "../prismaMock";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import * as productService from "../../services/product.service";
import {
  create,
  getAll,
  getById,
  update,
  remove,
  updateProductDiscountController,
} from "../../controllers/products.controller";

jest.mock("../../services/product.service");
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

const mockProduct = {
  id: 1,
  name: "Hamburger",
  imageUrl: "hamburger",
  description: "",
  price: 12.99,
  sale: 0,
  idle: false,
  stock: 10,
  comment: "Délicieux burger",
  categoryId: 1,
  category: { name: "Food", color: "red" },
};
const newProductBody = {
  name: "Pizza",
  description: "Bonne pizza",
  imageUrl: "pizza.jpg",
  price: "11.99",
  sale: "0",
  idle: "false",
  stock: "5",
  categoryId: "1",
};
const updateBody = {
  name: "Hamburger XL",
  description: "Plus grand",
  imageUrl: "hamburger-xl.jpg",
  price: "14.99",
  sale: "0",
  idle: "false",
  stock: "8",
  categoryId: "1",
};

app.post("/product/create", create);
app.get("/product/getAll", getAll);
app.get("/product/getById/:id", getById);
app.put("/product/update/:id", update);
app.delete("/product/remove/:id", remove);
app.post("/product/:id/discount", updateProductDiscountController);

describe("ProductControllerTests", () => {
  //---------------------------------------------------------------
  // rest les mocks avant chaque test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  //---------------------------------------------------------------
  // Teste getAll quand le produits sont valides
  it("getAll_WhenProductsAreValid", async () => {
    // Arrange
    const products = [
      {
        id: 1,
        name: "Hamburger",
        imageUrl: "hamburger",
        description: "",
        price: 12.99,
        comment: "Délicieux burger",
        category: { name: "Food", color: "red" },
      },
      {
        id: 2,
        name: "T-shirt",
        imageUrl: "t-shirt",
        description: "",
        price: 15.99,
        comment: "Belle qualité",
        category: { name: "Clothing", color: "blue" },
      },
      {
        id: 3,
        name: "Salade",
        imageUrl: "salade",
        description: "",
        price: 9.99,
        comment: "Fraîche et saine",
        category: { name: "Food", color: "red" },
      },
      {
        id: 4,
        name: "Cheeseburger",
        imageUrl: "hamburger",
        description: "",
        price: 13.99,
        comment: "Avec fromage",
        category: { name: "Food", color: "red" },
      },
    ];

    (productService.getAllProducts as jest.Mock<never>).mockResolvedValue(
      products,
    );

    // Act
    const response = await request(app).get("/product/getAll");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(products);
    expect(productService.getAllProducts).toHaveBeenCalled();
  });

  //---------------------------------------------------------------
  // Teste getAll quand le produits sont invalides/erreur
  it("getAll_WhenProductAreInvalid", async () => {
    // Arrange
    const mockedGetAllProducts =
      productService.getAllProducts as jest.MockedFunction<
        typeof productService.getAllProducts
      >;
    mockedGetAllProducts.mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/product/getAll");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "erreur" });
  });

  //---------------------------------------------------------------
  // Teste getById quand le produit existe
  it("getById_WhenProductExists", async () => {
    // Arrange
    (
      productService.getProductbyId as jest.MockedFunction<
        typeof productService.getProductbyId
      >
    ).mockResolvedValue(mockProduct as any);

    // Act
    const response = await request(app).get("/product/getById/1");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockProduct);
    expect(productService.getProductbyId).toHaveBeenCalledWith(1);
  });

  //---------------------------------------------------------------
  // Teste getById quand le produit n'existe pas
  it("getById_WhenProductNotFound", async () => {
    // Arrange
    (
      productService.getProductbyId as jest.MockedFunction<
        typeof productService.getProductbyId
      >
    ).mockResolvedValue(null as any);

    // Act
    const response = await request(app).get("/product/getById/999");

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "produit non trouvé" });
  });

  //---------------------------------------------------------------
  // Teste getById quand le service retourne une erreur
  it("getById_WhenServiceThrows", async () => {
    // Arrange
    (
      productService.getProductbyId as jest.MockedFunction<
        typeof productService.getProductbyId
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).get("/product/getById/1");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "erreur" });
  });

  //---------------------------------------------------------------
  // Teste create quand les données sont valides
  it("create_WhenDataIsValid", async () => {
    // Arrange
    (
      productService.createProduct as jest.MockedFunction<
        typeof productService.createProduct
      >
    ).mockResolvedValue({ ...mockProduct, name: "Pizza" } as any);

    // Act
    const response = await request(app)
      .post("/product/create")
      .send(newProductBody);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message: "produit créé",
      product: expect.objectContaining({ name: "Pizza" }),
    });
    expect(productService.createProduct).toHaveBeenCalled();
  });

  //---------------------------------------------------------------
  // Teste create quand le nom du produit existe déjà
  it("create_WhenProductNameAlreadyExists", async () => {
    // Arrange
    (
      productService.createProduct as jest.MockedFunction<
        typeof productService.createProduct
      >
    ).mockRejectedValue(new Error("Un produit avec ce nom existe déjà"));

    // Act
    const response = await request(app)
      .post("/product/create")
      .send(newProductBody);

    // Assert
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Un produit avec ce nom existe déjà",
    });
  });

  //---------------------------------------------------------------
  // Teste create quand le service retourne une erreur
  it("create_WhenServiceThrowsError", async () => {
    // Arrange
    (
      productService.createProduct as jest.MockedFunction<
        typeof productService.createProduct
      >
    ).mockRejectedValue({ message: null }); // sin message -> 500

    // Act
    const response = await request(app)
      .post("/product/create")
      .send(newProductBody);

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur serveur" });
  });

  //---------------------------------------------------------------
  // Teste update quand le produit existe
  it("update_WhenProductExists", async () => {
    // Arrange
    (
      productService.getProductbyId as jest.MockedFunction<
        typeof productService.getProductbyId
      >
    ).mockResolvedValue(mockProduct as any);
    (
      productService.updateProduct as jest.MockedFunction<
        typeof productService.updateProduct
      >
    ).mockResolvedValue({ ...mockProduct, name: "Hamburger XL" } as any);

    // Act
    const response = await request(app)
      .put("/product/update/1")
      .send(updateBody);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "mise a jour du produit faite",
      product: expect.objectContaining({ name: "Hamburger XL" }),
    });
  });

  //---------------------------------------------------------------
  // Teste update quand le produit n'existe pas
  it("update_WhenProductNotFound", async () => {
    // Arrange
    (
      productService.getProductbyId as jest.MockedFunction<
        typeof productService.getProductbyId
      >
    ).mockResolvedValue(null as any);

    // Act
    const response = await request(app)
      .put("/product/update/999")
      .send(updateBody);

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "produit non trouvé" });
  });

  //---------------------------------------------------------------
  // Teste update quand le service retourne une erreur
  it("update_WhenServiceThrowsError", async () => {
    // Arrange
    (
      productService.getProductbyId as jest.MockedFunction<
        typeof productService.getProductbyId
      >
    ).mockResolvedValue(mockProduct as any);
    (
      productService.updateProduct as jest.MockedFunction<
        typeof productService.updateProduct
      >
    ).mockRejectedValue({ message: null }); // sin message -> 500

    // Act
    const response = await request(app)
      .put("/product/update/1")
      .send(updateBody);

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur" });
  });

  //---------------------------------------------------------------
  // Teste remove quand le produit existe
  it("remove_WhenProductExists", async () => {
    // Arrange
    (
      productService.getProductbyId as jest.MockedFunction<
        typeof productService.getProductbyId
      >
    ).mockResolvedValue(mockProduct as any);
    (
      productService.deleteProduct as jest.MockedFunction<
        typeof productService.deleteProduct
      >
    ).mockResolvedValue(mockProduct as any);

    // Act
    const response = await request(app).delete("/product/remove/1");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Producto effacé" });
  });

  //---------------------------------------------------------------
  // Teste remove quand le produit n'existe pas
  it("remove_WhenProductNotFound", async () => {
    // Arrange
    (
      productService.getProductbyId as jest.MockedFunction<
        typeof productService.getProductbyId
      >
    ).mockResolvedValue(null as any);

    // Act
    const response = await request(app).delete("/product/remove/999");

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "produit non trouvé" });
  });

  //---------------------------------------------------------------
  // Teste remove quand le service retourne une erreur
  it("remove_WhenServiceThrowsError", async () => {
    // Arrange
    (
      productService.getProductbyId as jest.MockedFunction<
        typeof productService.getProductbyId
      >
    ).mockResolvedValue(mockProduct as any);
    (
      productService.deleteProduct as jest.MockedFunction<
        typeof productService.deleteProduct
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app).delete("/product/remove/1");

    // Assert
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur" });
  });

  //---------------------------------------------------------------
  // Teste updateDiscount quand le pourcentage est vide
  it("updateDiscount_WhenPercentIsValid", async () => {
    // Arrange
    const updateProduct = {
      ...mockProduct,
      salePercent: 20,
      finalPrice: 10.39,
    };
    (
      productService.updateProductDiscount as jest.MockedFunction<
        typeof productService.updateProductDiscount
      >
    ).mockResolvedValue(updateProduct as any);

    // Act
    const response = await request(app)
      .post("/product/1/discount")
      .send({ discountPercent: 20 });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Rabais mis à jour avec succès",
      product: expect.objectContaining({ salePercent: 20, finalPrice: 10.39 }),
    });
    expect(productService.updateProductDiscount).toHaveBeenCalledWith(1, 20);
  });

  //---------------------------------------------------------------
  // Teste updateDiscount quand le pourcentage est invalide (>90 ou <0)
  it("updateDiscount_WhenPercentIsInvalid", async () => {
    // Arrange
    (
      productService.updateProductDiscount as jest.MockedFunction<
        typeof productService.updateProductDiscount
      >
    ).mockRejectedValue(new Error("Le rabais doit être entre 0 et 90"));

    // Act
    const response = await request(app)
      .post("/product/1/discount")
      .send({ discountPercent: 150 });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Le rabais doit être entre 0 et 90",
    });
    expect(productService.updateProductDiscount).toHaveBeenCalledWith(1, 150);
  });

  //---------------------------------------------------------------
  // Teste updateDiscount quand le produit n'existe pas
  it("updateDiscount_WhenProductNotFound", async () => {
    // Arrange
    (
      productService.updateProductDiscount as jest.MockedFunction<
        typeof productService.updateProductDiscount
      >
    ).mockRejectedValue(new Error("Produit non trouvé"));

    // Act
    const response = await request(app)
      .post("/product/999/discount")
      .send({ discountPercent: 20 });

    // Assert
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Produit non trouvé" });
  });

  //---------------------------------------------------------------
  // Teste updateDiscount quand le service retourne une erreur
  it("updateDiscount_WhenServiceThrowsError", async () => {
    // Arrange
    (
      productService.updateProductDiscount as jest.MockedFunction<
        typeof productService.updateProductDiscount
      >
    ).mockRejectedValue(new Error("DB error"));

    // Act
    const response = await request(app)
      .post("/product/1/discount")
      .send({ discountPercent: 20 });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "DB error" });
  });
});
