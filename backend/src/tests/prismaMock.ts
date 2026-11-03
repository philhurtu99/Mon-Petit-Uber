import { PrismaClient } from "../../generated/prisma";
import { mockDeep, mockReset, DeepMockProxy } from "jest-mock-extended";
import { prisma } from "../lib/prisma";
import { beforeEach, jest } from "@jest/globals";

// Permet de mock la base de données pour les tests
jest.mock("../lib/prisma", () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

// Réinitialise les mocks avant chaque test
beforeEach(() => {
  mockReset(prismaMock);
});
