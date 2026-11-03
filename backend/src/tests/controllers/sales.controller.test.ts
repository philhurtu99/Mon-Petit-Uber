import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";

// Mock the service
jest.mock("../../services/sales.service", () => ({
  getOverallStats: jest.fn(),
  getBestSellers: jest.fn(),
  getProductPerformance: jest.fn(),
  generateSalesExportCsv: jest.fn(),
}));

import * as salesService from "../../services/sales.service";
import * as salesController from "../../controllers/sales.controller";

const makeReqRes = (reqOverrides?: any) => {
  const req = {
    query: {},
    params: {},
    ...reqOverrides,
  } as unknown as Request;

  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);

  return { req, res };
};

describe("SalesControllerTests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getOverallStats", () => {
    //---------------------------------------------------------------
    // Vérifie que les statistiques globales sont retournées avec un statut 200 en cas de succès
    it("GetOverallStats_OnSuccess_Returns200", async () => {
      const mockStats = { totalRevenue: 100, totalOrders: 5 };
      (salesService.getOverallStats as jest.Mock).mockResolvedValue(mockStats);

      const { req, res } = makeReqRes({ query: { startDate: "2024-01-01" } });
      await salesController.getOverallStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    //---------------------------------------------------------------
    // Vérifie qu'une erreur 500 est retournée en cas d'échec du service
    it("GetOverallStats_OnError_Returns500", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      (salesService.getOverallStats as jest.Mock).mockRejectedValue(
        new Error("Fail"),
      );

      const { req, res } = makeReqRes();
      await salesController.getOverallStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Erreur lors de la récupération des statistiques globales",
      });
      consoleSpy.mockRestore();
    });
  });

  describe("getBestSellers", () => {
    //---------------------------------------------------------------
    // Vérifie que les meilleurs vendeurs sont retournés avec un statut 200
    it("GetBestSellers_OnSuccess_Returns200", async () => {
      const mockData = [{ productId: 1, name: "A" }];
      (salesService.getBestSellers as jest.Mock).mockResolvedValue(mockData);

      const { req, res } = makeReqRes({ query: { limit: "10" } });
      await salesController.getBestSellers(req, res);

      expect(salesService.getBestSellers).toHaveBeenCalledWith(
        expect.anything(),
        10,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockData);
    });
  });

  describe("getProductPerformance", () => {
    //---------------------------------------------------------------
    // Vérifie que les performances produits sont retournées avec un statut 200
    it("GetProductPerformance_OnSuccess_Returns200", async () => {
      const mockData = [{ productId: 1, name: "A", stock: 10 }];
      (salesService.getProductPerformance as jest.Mock).mockResolvedValue(
        mockData,
      );

      const { req, res } = makeReqRes();
      await salesController.getProductPerformance(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockData);
    });
  });

  describe("exportSalesCsv", () => {
    //---------------------------------------------------------------
    // Vérifie que l'export CSV est retourné avec les bons headers et un statut 200
    it("ExportSalesCsv_OnSuccess_ReturnsCsv", async () => {
      const mockCsv = "ID,Name\n1,Product";
      (salesService.generateSalesExportCsv as jest.Mock).mockResolvedValue(
        mockCsv,
      );

      const { req, res } = makeReqRes();
      await salesController.exportSalesCsv(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/csv; charset=utf-8",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockCsv);
    });
  });
});
