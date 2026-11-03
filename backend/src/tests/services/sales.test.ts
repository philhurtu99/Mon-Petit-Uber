import { prismaMock } from "../prismaMock";
import * as salesService from "../../services/sales.service";
import { describe, expect, it } from "@jest/globals";

describe("SalesServiceTests", () => {
  const startDate = new Date("2024-01-01");
  const endDate = new Date("2024-01-31");
  const filter = { startDate, endDate };

  describe("getOverallStats", () => {
    //---------------------------------------------------------------
    // Teste getOverallStats quand aucune transaction n'est trouvée
    it("getOverallStats_WhenNoTransactionsFound", async () => {
      prismaMock.transaction.findMany.mockResolvedValue([]);

      const result = await salesService.getOverallStats(filter);

      expect(result).toEqual({
        totalRevenue: 0,
        totalOrders: 0,
        totalItemsSold: 0,
        averageOrderValue: 0,
      });
      expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            purchaseDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      );
    });

    //---------------------------------------------------------------
    // Teste getOverallStats avec des données valides
    it("getOverallStats_WhenDataIsValid", async () => {
      const mockTransactions = [
        { total: 100, items: [{ quantity: 2 }, { quantity: 3 }] },
        { total: 50, items: [{ quantity: 1 }] },
      ] as any;
      prismaMock.transaction.findMany.mockResolvedValue(mockTransactions);

      const result = await salesService.getOverallStats(filter);

      expect(result).toEqual({
        totalRevenue: 150,
        totalOrders: 2,
        totalItemsSold: 6,
        averageOrderValue: 75,
      });
    });
  });

  describe("getBestSellers", () => {
    //---------------------------------------------------------------
    // Teste getBestSellers pour retourner les meilleurs produits
    it("getBestSellers_ShouldReturnTopSellingProducts", async () => {
      const mockGroupedSales = [
        { productId: 1, _sum: { quantity: 10 } },
        { productId: 2, _sum: { quantity: 5 } },
      ] as any;
      const mockProducts = [
        {
          id: 1,
          name: "Product A",
          imageUrl: "imgA",
          price: 20,
          productReviews: [],
        },
        {
          id: 2,
          name: "Product B",
          imageUrl: "imgB",
          price: 10,
          productReviews: [],
        },
      ] as any;

      prismaMock.transactionItem.groupBy.mockResolvedValue(mockGroupedSales);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await salesService.getBestSellers(filter, 5);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        productId: 1,
        name: "Product A",
        imageUrl: "imgA",
        price: 20,
        totalQuantity: 10,
        totalRevenue: 200,
        avgRating: 0,
        reviewCount: 0,
      });
      expect(result[1].totalRevenue).toBe(50);
    });

    //---------------------------------------------------------------
    // Teste getBestSellers avec des produits inconnus
    it("getBestSellers_WhenProductsAreUnknown", async () => {
      prismaMock.transactionItem.groupBy.mockResolvedValue([
        { productId: 99, _sum: { quantity: 1 } },
      ] as any);
      prismaMock.product.findMany.mockResolvedValue([]);

      const result = await salesService.getBestSellers(filter);

      expect(result[0].name).toBe("Produit inconnu");
      expect(result[0].price).toBe(0);
    });
  });

  describe("getProductPerformance", () => {
    //---------------------------------------------------------------
    // Teste getProductPerformance pour retourner les performances détaillées
    it("getProductPerformance_ShouldReturnDetailedPerformance", async () => {
      const mockGroupedSales = [
        { productId: 1, _sum: { quantity: 10 } },
      ] as any;
      const mockProducts = [
        {
          id: 1,
          name: "Product A",
          price: 20,
          stock: 50,
          category: { name: "Category X" },
          productReviews: [],
        },
      ] as any;

      prismaMock.transactionItem.groupBy.mockResolvedValue(mockGroupedSales);
      prismaMock.product.findMany.mockResolvedValue(mockProducts);

      const result = await salesService.getProductPerformance(filter);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        productId: 1,
        name: "Product A",
        category: "Category X",
        unitPrice: 20,
        totalQuantity: 10,
        totalRevenue: 200,
        stock: 50,
        avgRating: 0,
        reviewCount: 0,
      });
    });
  });

  describe("generateSalesExportCsv", () => {
    //---------------------------------------------------------------
    // Teste generateSalesExportCsv pour générer un CSV valide
    it("generateSalesExportCsv_ShouldGenerateValidCsv", async () => {
      // Mock getProductPerformance by mocking the prisma calls it makes
      prismaMock.transactionItem.groupBy.mockResolvedValue([
        { productId: 1, _sum: { quantity: 2 } },
      ] as any);
      prismaMock.product.findMany.mockResolvedValue([
        {
          id: 1,
          name: "Product A",
          price: 10,
          stock: 100,
          category: { name: "Cat X" },
          productReviews: [],
        },
      ] as any);

      const csv = await salesService.generateSalesExportCsv(filter);

      const lines = csv.split("\n");
      expect(lines[0]).toContain("ID Produit,Nom,Catégorie");
      expect(lines[0]).toContain("Note Moyenne,Nombre d'Avis");
      expect(lines[1]).toContain("1,Product A,Cat X,10,2,20,100,0.00,0");
    });

    //---------------------------------------------------------------
    // Teste generateSalesExportCsv avec des caractères spéciaux à échapper
    it("generateSalesExportCsv_ShouldEscapeSpecialCharacters", async () => {
      prismaMock.transactionItem.groupBy.mockResolvedValue([
        { productId: 1, _sum: { quantity: 1 } },
      ] as any);
      prismaMock.product.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Product "Special", Name',
          price: 10,
          stock: 100,
          category: { name: "Cat X" },
          productReviews: [],
        },
      ] as any);

      const csv = await salesService.generateSalesExportCsv(filter);
      expect(csv).toContain('"Product ""Special"", Name"');
    });
  });
});
