import { create, getAll, getById, update, remove } from "../../controllers/promotion.controller";
import { prisma } from "../../lib/prisma";

jest.mock("../../lib/prisma", () => ({
  prisma: {
    promotion: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("Promotion Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should return 400 if required fields are missing", async () => {
      const req: any = { body: {} };
      const res = mockRes();

      await create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 if type is invalid", async () => {
      const req: any = {
        body: {
          name: "Promo",
          type: "INVALID",
          targetProductId: 1,
          endDate: new Date(Date.now() + 10000).toISOString(),
        },
      };
      const res = mockRes();

      await create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 if name already exists", async () => {
      (prisma.promotion.findFirst as jest.Mock).mockResolvedValue({ id: 1 });

      const req: any = {
        body: {
          name: "Existing",
          type: "FREE_ITEM",
          targetProductId: 1,
          bonusProductId: 2,
          quantity: 1,
          endDate: new Date(Date.now() + 10000).toISOString(),
        },
      };
      const res = mockRes();

      await create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if target product not found", async () => {
      (prisma.promotion.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const req: any = {
        body: {
          name: "Promo",
          type: "FREE_ITEM",
          targetProductId: 1,
          bonusProductId: 2,
          endDate: new Date(Date.now() + 10000).toISOString(),
        },
      };
      const res = mockRes();

      await create(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should create a promotion successfully", async () => {
      (prisma.promotion.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 1, name: "Product A" }) // target
        .mockResolvedValueOnce({ id: 2, name: "Product B" }); // bonus

      (prisma.promotion.create as jest.Mock).mockResolvedValue({
        id: 1,
        name: "Promo",
      });

      const req: any = {
        body: {
          name: "Promo",
          type: "FREE_ITEM",
          targetProductId: 1,
          bonusProductId: 2,
          quantity: 1,
          endDate: new Date(Date.now() + 10000).toISOString(),
        },
      };
      const res = mockRes();

      await create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(prisma.promotion.create).toHaveBeenCalled();
    });

    it("should return 400 if FREE_ITEM quantity is missing", async () => {
      (prisma.promotion.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.product.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 1, name: "Product A" })
        .mockResolvedValueOnce({ id: 2, name: "Product B" });

      const req: any = {
        body: {
          name: "Promo",
          type: "FREE_ITEM",
          targetProductId: 1,
          bonusProductId: 2,
          endDate: new Date(Date.now() + 10000).toISOString(),
        },
      };
      const res = mockRes();

      await create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.promotion.create).not.toHaveBeenCalled();
    });
  });

  describe("getAll", () => {
    it("should return all promotions", async () => {
      (prisma.promotion.findMany as jest.Mock).mockResolvedValue([]);

      const res = mockRes();

      await getAll({} as any, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getById", () => {
    it("should return 400 for invalid id", async () => {
      const req: any = { params: { id: "abc" } };
      const res = mockRes();

      await getById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if promotion not found", async () => {
      (prisma.promotion.findUnique as jest.Mock).mockResolvedValue(null);

      const req: any = { params: { id: "1" } };
      const res = mockRes();

      await getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return promotion", async () => {
      (prisma.promotion.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

      const req: any = { params: { id: "1" } };
      const res = mockRes();

      await getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("update", () => {
    it("should return 400 for invalid id", async () => {
      const req: any = { params: { id: "abc" }, body: {} };
      const res = mockRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if promotion not found", async () => {
      (prisma.promotion.findUnique as jest.Mock).mockResolvedValue(null);

      const req: any = { params: { id: "1" }, body: {} };
      const res = mockRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should update successfully", async () => {
      (prisma.promotion.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        name: "Old",
      });

      (prisma.promotion.update as jest.Mock).mockResolvedValue({
        id: 1,
        name: "New",
      });

      const req: any = {
        params: { id: "1" },
        body: { name: "New" },
      };
      const res = mockRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should return 400 if FREE_ITEM quantity is invalid on update", async () => {
      (prisma.promotion.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        name: "Old",
        type: "FREE_ITEM",
        quantity: 3,
        bonusProductId: 2,
      });

      const req: any = {
        params: { id: "1" },
        body: { quantity: 0 },
      };
      const res = mockRes();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.promotion.update).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should return 400 for invalid id", async () => {
      const req: any = { params: { id: "abc" } };
      const res = mockRes();

      await remove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 404 if promotion not found", async () => {
      (prisma.promotion.findUnique as jest.Mock).mockResolvedValue(null);

      const req: any = { params: { id: "1" } };
      const res = mockRes();

      await remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should delete promotion", async () => {
      (prisma.promotion.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.promotion.delete as jest.Mock).mockResolvedValue({ id: 1 });

      const req: any = { params: { id: "1" } };
      const res = mockRes();

      await remove(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
