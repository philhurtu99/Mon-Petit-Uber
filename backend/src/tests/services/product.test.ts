import { prismaMock } from "../prismaMock";
import {
  getProductbyId,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../services/product.service";
import { describe, expect, it } from "@jest/globals";

describe("ProductServiceTests", () => {
  //---------------------------------------------------------------
  // Teste getProductbyId quand le Id est invalide
  it("getProductbyId_WhenProductIdInvalid", async () => {
    // Arrange
    prismaMock.product.findUnique.mockResolvedValue(null);

    // Act
    const result = await getProductbyId(-1);

    // Assert
    expect(result).toBeNull();
  });

  //---------------------------------------------------------------
  // Teste getProductbyId quand le Id est valide
  it("getProductbyId_WhenProductIdIsValid", async () => {
    // Arrange
    const product = {
      id: 10,
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: 12.99,
      comment: "Délicieux burger",
    } as any;
    prismaMock.product.findUnique.mockResolvedValue(product);

    // Act
    const result = await getProductbyId(10);

    // Assert
    expect(result?.id).toBe(product.id);
    expect(result?.name).toBe(product.name);
    expect(result?.description).toBe(product.description);
    expect(result?.imageUrl).toBe(product.imageUrl);
  });

  //---------------------------------------------------------------
  // Teste getAllProducts quand il n'y a pas des produits
  it("getAllProducts_WhenProductIsEmpty", async () => {
    // Arrange
    const produits = [] as any;
    prismaMock.product.findMany.mockResolvedValue(produits);

    // Act
    const result = await getAllProducts();

    // Assert
    expect(result).toEqual([]);
  });

  //---------------------------------------------------------------
  // Teste getAllProducts quand il n'y a pas des produits
  it("getAllProducts_WhenProductHaveData", async () => {
    // Arrange
    const produits = [
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
    ] as any;
    prismaMock.product.findMany.mockResolvedValue(produits as any);

    // Act
    const result = await getAllProducts();

    // Assert
    expect(result?.length).toBe(4);
  });

  //---------------------------------------------------------------
  // Teste createProduct quand data est null
  it("createProduct_WhenDataIsNull", async () => {
    // Arrange
    const data = null;

    // Act
    const result = createProduct(data);

    // Assert
    await expect(result).rejects.toThrow("Nom invalide");
  });

  //---------------------------------------------------------------
  // Teste createProduct quand le nom est trop court
  it("createProduct_WhenDataNametooShort", async () => {
    // Arrange
    const data = {
      name: "H",
      imageUrl: "hamburger",
      description: "",
      price: 12.99,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = createProduct(data);

    // Assert
    await expect(result).rejects.toThrow("Nom invalide");
  });

  //---------------------------------------------------------------
  // Teste createProduct quand le prix est zero
  it("createProduct_WhenDataPriceIsZero", async () => {
    // Arrange
    const data = {
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: 0,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = createProduct(data);

    // Assert
    await expect(result).rejects.toThrow("Le prix doit être supérieur à 0");
  });

  //---------------------------------------------------------------
  // Teste createProduct quand le prix est n3gatif
  it("createProduct_WhenDataPriceIsNegatif", async () => {
    // Arrange
    const data = {
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: -10,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = createProduct(data);

    // Assert
    await expect(result).rejects.toThrow("Le prix doit être supérieur à 0");
  });

  //---------------------------------------------------------------
  // Teste createProduct quand le stock est n3gatif
  it("createProduct_WhenDataStockIsNegatif", async () => {
    // Arrange
    const data = {
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: 10,
      stock: -2,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = createProduct(data);

    // Assert
    await expect(result).rejects.toThrow("Le stock ne peut pas être négatif");
  });

  //---------------------------------------------------------------
  // Teste createProduct quand le 'sale' est négatif
  it("createProduct_WhenDataSaleIsNegatif", async () => {
    // Arrange
    const data = {
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: 10,
      stock: 2,
      sale: -3,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = createProduct(data);

    // Assert
    await expect(result).rejects.toThrow("Le rabais doit être entre 0 et 90");
  });

  //---------------------------------------------------------------
  // Teste createProduct quand le 'sale' est plus grand que 90
  it("createProduct_WhenDataSaleIsBiggerThan90", async () => {
    // Arrange
    const data = {
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: 10,
      stock: 2,
      sale: 100,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = createProduct(data);

    // Assert
    await expect(result).rejects.toThrow("Le rabais doit être entre 0 et 90");
  });

  //---------------------------------------------------------------
  // Teste createProduct quand le 'nom' existe déjà
  it("createProduct_WhenDataNameAlreadyExist", async () => {
    // Arrange
    const produits = [
      {
        id: 3,
        name: "Salade",
        imageUrl: "salade",
        description: "",
        price: 9.99,
        comment: "Fraîche et saine",
      },
    ] as any;
    prismaMock.product.findFirst.mockResolvedValue(produits);

    const data = {
      name: "Salade",
      imageUrl: "hamburger",
      description: "",
      price: 10,
      stock: 2,
      comment: "",
    } as any;

    // Act
    const result = createProduct(data);

    // Assert
    await expect(result).rejects.toThrow("Un produit avec ce nom existe déjà");
  });

  //---------------------------------------------------------------
  // Teste createProduct quand la data est valide
  it("createProduct_WhenDataIsValid", async () => {
    // Arrange
    prismaMock.product.findFirst.mockResolvedValue(null);

    const data = {
      name: "Tacos",
      imageUrl: "Tacos",
      description: "",
      price: 5,
      finalPrice: 1,
      stock: 2,
      sale: 80,
      comment: "",
    } as any;

    prismaMock.product.create.mockResolvedValue(data as any);
    // Act
    const result = await createProduct(data);

    // Assert
    expect(prismaMock.product.create).toHaveBeenCalledWith({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        finalPrice: data.finalPrice,
        sale: data.sale,
        idle: data.idle,
        stock: data.stock,
        categoryId: data.categoryId,
      },
    });

    expect(result).toEqual(data);

    expect(result?.id).toBe(data.id);
    expect(result?.name).toBe(data.name);
    expect(result?.description).toBe(data.description);
    expect(result?.imageUrl).toBe(data.imageUrl);
  });

  //---------------------------------------------------------------
  //---------------------------------------------------------------
  // Teste updateProduct quand data est null
  it("updateProduct_WhenDataIsNull", async () => {
    // Arrange
    const data = null;

    // Act
    const result = updateProduct(1, data);

    // Assert
    await expect(result).rejects.toThrow("Nom invalide");
  });

  //---------------------------------------------------------------
  // Teste updateProduct quand le nom est trop court
  it("updateProduct_WhenDataNametooShort", async () => {
    // Arrange
    const data = {
      id: 2,
      name: "H",
      imageUrl: "hamburger",
      description: "",
      price: 12.99,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = updateProduct(2, data);

    // Assert
    await expect(result).rejects.toThrow("Nom invalide");
  });

  //---------------------------------------------------------------
  // Teste updateProduct quand le prix est zero
  it("updateProduct_WhenDataPriceIsZero", async () => {
    // Arrange
    const data = {
      id: 2,
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: 0,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = updateProduct(2, data);

    // Assert
    await expect(result).rejects.toThrow("Le prix doit être supérieur à 0");
  });

  //---------------------------------------------------------------
  // Teste updateProduct quand le prix est n3gatif
  it("updateProduct_WhenDataPriceIsNegatif", async () => {
    // Arrange
    const data = {
      id: 2,
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: -10,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = updateProduct(2, data);

    // Assert
    await expect(result).rejects.toThrow("Le prix doit être supérieur à 0");
  });

  //---------------------------------------------------------------
  // Teste updateProduct quand le stock est n3gatif
  it("updateProduct_WhenDataStockIsNegatif", async () => {
    // Arrange
    const data = {
      id: 2,
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: 10,
      stock: -2,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = updateProduct(2, data);

    // Assert
    await expect(result).rejects.toThrow("Le stock ne peut pas être négatif");
  });

  //---------------------------------------------------------------
  // Teste updateProduct quand le 'sale' est négatif
  it("updateProduct_WhenDataSaleIsNegatif", async () => {
    // Arrange
    const data = {
      id: 2,
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: 10,
      stock: 2,
      sale: -3,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = updateProduct(2, data);

    // Assert
    await expect(result).rejects.toThrow("Le rabais doit être entre 0 et 90");
  });

  //---------------------------------------------------------------
  // Teste updateProduct quand le 'sale' est plus grand que 90
  it("updateProduct_WhenDataSaleIsBiggerThan90", async () => {
    // Arrange
    const data = {
      id: 2,
      name: "Hamburger",
      imageUrl: "hamburger",
      description: "",
      price: 10,
      stock: 2,
      sale: 100,
      comment: "Délicieux burger",
    } as any;

    // Act
    const result = updateProduct(2, data);

    // Assert
    await expect(result).rejects.toThrow("Le rabais doit être entre 0 et 90");
  });

  //---------------------------------------------------------------
  // Teste updateProduct quand le 'nom' existe déjà
  it("updateProduct_WhenDataNameAlreadyExist", async () => {
    // Arrange
    const produits = [
      {
        id: 3,
        name: "Salade",
        imageUrl: "salade",
        description: "",
        price: 9.99,
        finalPrice: 9,
        comment: "Fraîche et saine",
      },
    ] as any;
    prismaMock.product.findFirst.mockResolvedValue(produits);

    const data = {
      id: 2,
      name: "Salade",
      imageUrl: "hamburger",
      description: "",
      price: 10,
      stock: 2,
      comment: "",
    } as any;

    // Act
    const result = updateProduct(2, data);

    // Assert
    await expect(result).rejects.toThrow("Un produit avec ce nom existe déjà");
  });

  //---------------------------------------------------------------
  // Teste updateProduct quand la data est valide
  it("updateProduct_WhenDataIsValid", async () => {
    // Arrange
    prismaMock.product.findFirst.mockResolvedValue(null);

    const data = {
      id: 3,
      name: "Tacos",
      imageUrl: "Tacos",
      description: "",
      price: 5,
      finalPrice: 1,
      stock: 2,
      sale: 80,
      comment: "",
    } as any;

    prismaMock.product.update.mockResolvedValue({ ...data, id: 3 });
    // Act
    const result = await updateProduct(3, data);

    // Assert
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        price: data.price,
        finalPrice: data.finalPrice,
        sale: data.sale,
        idle: data.idle,
        stock: data.stock,
        categoryId: data.categoryId,
      },
    });

    expect(result).toEqual(data);

    expect(result?.id).toBe(data.id);
    expect(result?.name).toBe(data.name);
    expect(result?.description).toBe(data.description);
    expect(result?.imageUrl).toBe(data.imageUrl);
  });

  //---------------------------------------------------------------
  // Teste updateProduct quand la data est valide
  it("deleteProduct_WhenDataIsValid", async () => {
    // Arrange
    const produits = [
      {
        id: 1,
        name: "Hamburger",
        imageUrl: "hamburger",
        description: "",
        price: 12.99,
        comment: "Délicieux burger",
      },
      {
        id: 2,
        name: "T-shirt",
        imageUrl: "t-shirt",
        description: "",
        price: 15.99,
        comment: "Belle qualité",
      },
      {
        id: 3,
        name: "Salade",
        imageUrl: "salade",
        description: "",
        price: 9.99,
        comment: "Fraîche et saine",
      },
      {
        id: 4,
        name: "Cheeseburger",
        imageUrl: "hamburger",
        description: "",
        price: 13.99,
        comment: "Avec fromage",
      },
    ] as any;
    prismaMock.product.findMany.mockResolvedValue(produits);

    const theId = 3;
    const data = {
      id: 3,
      name: "Salade",
      imageUrl: "salade",
      description: "",
      price: 9.99,
      comment: "Fraîche et saine",
    };

    prismaMock.product.delete.mockResolvedValue(data as any);
    // Act
    const result = await deleteProduct(theId);

    expect(prismaMock.product.delete).toHaveBeenCalledWith({
      where: { id: theId },
    });

    expect(result).toEqual(data);
  });
});
