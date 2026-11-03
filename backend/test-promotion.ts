import { getRequiredEnv } from "./src/utils/env";
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma";

const connectionString =
  getRequiredEnv("DATABASE_URL");

async function testPromotions() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const promotions = await prisma.promotion.findMany({
      include: {
        targetProduct: true,
        bonusProduct: true,
      },
    });

    promotions.forEach((p) => {});

    // Vérifier les produits
    const products = await prisma.product.findMany({
      take: 5,
      select: { id: true, name: true, price: true },
    });

    products.forEach((p) => {});

    // Créer une promotion test si elle n'existe pas
    const targetProduct = await prisma.product.findFirst();
    if (targetProduct) {
      const existingPromo = await prisma.promotion.findFirst({
        where: {
          targetProductId: targetProduct.id,
          type: "BUY_X_GET_Y",
        },
      });

      if (existingPromo) {
      } else {
        const newPromo = await prisma.promotion.create({
          data: {
            name: `2 pour 1 sur ${targetProduct.name}`,
            description: "Achetez 2, payez 1",
            type: "BUY_X_GET_Y",
            targetProductId: targetProduct.id,
            quantity: 2,
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
            isActive: true,
          },
        });
      }
    }

    // Test de calcul du panier avec promo
    const { calculateCartTotal } =
      await import("./src/services/promotion.service");

    const testCart = [
      {
        productId: targetProduct!.id,
        quantity: 3,
        productName: targetProduct!.name,
        price: targetProduct!.price,
      },
    ];

    const result = await calculateCartTotal(testCart);
  } catch (err) {
    console.error("❌ Erreur:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testPromotions();
