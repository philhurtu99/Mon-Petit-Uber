import { getRequiredEnv } from "../src/utils/env";
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  CategoryNameFaq,
  CommandeType,
  CommandeEtat,
} from "../generated/prisma";
import bcrypt from "bcrypt";
import { prisma } from "../src/lib/prisma";

const connectionString =
  getRequiredEnv("DATABASE_URL");

export async function runSeed() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.productReview.deleteMany();
    await prisma.transactionItem.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.commande.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    await prisma.category.createMany({
      data: [
        { id: 1, name: "Électronique", color: "#3B82F6" },
        { id: 2, name: "Vêtements", color: "#10B981" },
        { id: 3, name: "Alimentation", color: "#F59E0B" },
        { id: 4, name: "Maison", color: "#8B5CF6" },
      ],
    });

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const adminUser = await prisma.user.upsert({
      where: { email: "admin@admin.com" },
      update: {},
      create: {
        firstName: "Admin",
        lastName: "Principal",
        email: "admin@admin.com",
        password: hashedPassword,
        emailVerifiedAt: new Date(),
        role: "admin",
        address: "123 Rue de l'Admin",
        phone: "555-000-0000",
      },
    });

    await prisma.restrictedWord.createMany({
      data: [
        "idiot",
        "imbécile",
        "stupide",
        "nul",
        "merde",
        "con",
        "connard",
        "salope",
        "pute",
        "putain",
        "baise",
        "baiser",
        "bite",
        "queue",
        "couille",
        "couilles",
        "chatte",
        "nichon",
        "nichons",
        "sexe",
        "sexuel",
        "porn",
        "porno",
        "pornographie",
        "nude",
        "nudes",
        "nue",
        "nu",
        "penis",
        "pénis",
        "vagin",
        "vulve",
        "clitoris",
        "orgasme",
        "masturbation",
        "masturber",
        "sodomie",
        "sodomiser",
        "suce",
        "sucer",
        "blowjob",
        "handjob",
        "anal",
        "cum",
        "dick",
        "cock",
        "pussy",
        "boobs",
        "tits",
        "sex",
        "sexy",
        "horny",
        "fuck",
        "shit",
        "bitch",
        "asshole",
        "caliss",
        "calisse",
        "tabarnak",
        "tabarnaque",
        "fucking",
        "criss",
        "esti",
        "estique",
        "marde",
        "enculé",
        "enculer",
        "fils de pute",
      ].map((word) => ({
        word,
        active: true,
        source: "admin",
        detectedByAi: false,
        createdById: adminUser.id,
      })),
      skipDuplicates: true,
    });

    const userPassword = await bcrypt.hash("user123", 10);

    const usersNames = [
      ["Alejandro", "García"],
      ["Camila", "Rodríguez"],
      ["Diego", "Martínez"],
      ["Isabella", "López"],
      ["Mateo", "Hernández"],
      ["Valentina", "Pérez"],
      ["Santiago", "González"],
      ["Lucía", "Ramírez"],
      ["Emiliano", "Torres"],
      ["Sofía", "Flores"],
      ["Javier", "Rivera"],
      ["Mariana", "Morales"],
      ["Carlos", "Castillo"],
      ["Renata", "Ortiz"],
      ["Antonio", "Vargas"],
      ["Gabriela", "Cruz"],
    ];

    for (let i = 1; i <= 16; i++) {
      const startingCredit = i <= 5 ? 25 : 0;

      await prisma.user.upsert({
        where: { email: `user${i}@user.com` },
        update: { creditBalance: startingCredit },
        create: {
          firstName: usersNames[i - 1]?.[0] || 'User',
          lastName: usersNames[i - 1]?.[1] || `${i}`,
          email: `user${i}@user.com`,
          password: userPassword,
          emailVerifiedAt: new Date(),
          role: "user", // Par défaut, mais on peut le spécifier
          address: `${i} Rue des Utilisateurs`,
          phone: `555-00${i.toString().padStart(2, "0")}`,
          creditBalance: startingCredit,
        },
      });
    }

    const employePassword = await bcrypt.hash("employe123", 10);
    const employes = [
      {
        firstName: "Emma",
        lastName: "Preparatrice",
        email: "employe1@employe.com",
        address: "101 Rue des Employés",
        phone: "555-101-0001",
      },
      {
        firstName: "Leo",
        lastName: "Livreur",
        email: "employe2@employe.com",
        address: "102 Rue des Employés",
        phone: "555-101-0002",
      },
      {
        firstName: "Mia",
        lastName: "Polyvalente",
        email: "employe3@employe.com",
        address: "103 Rue des Employés",
        phone: "555-101-0003",
      },
      {
        firstName: "Bapabo",
        lastName: "Livreur",
        email: "bapabo7513@gixpos.com",
        address: "104 Rue des Employés",
        phone: "555-101-0004",
      },
    ];

    for (const employe of employes) {
      await prisma.user.upsert({
        where: { email: employe.email },
        update: { role: "employe" },
        create: {
          ...employe,
          password: employePassword,
          emailVerifiedAt: new Date(),
          role: "employe",
        },
      });
    }



    await prisma.product.createMany({
      data: [
        {
          name: "Chandail noir",
          description:
            "Chandail en coton doux et respirant, idéal pour le quotidien",
          stock: 15,
          price: 30,
          sale: 20,
          finalPrice: 24,
          idle: false,
          imageUrl:
            "https://png.pngtree.com/png-clipart/20230429/ourmid/pngtree-black-regular-fit-t-shirt-mockup-png-image_6740848.png",
          categoryId: 2,
        },
        {
          name: "Chandail blanc",
          description:
            "Chandail en coton léger, coupe décontractée et polyvalente",
          stock: 20,
          price: 25,
          sale: 0,
          finalPrice: 25,
          idle: false,
          imageUrl:
            "https://png.pngtree.com/png-vector/20230902/ourmid/pngtree-white-t-shirt-mockup-realistic-t-shirt-png-image_9906363.png",
          categoryId: 2,
        },
        {
          name: "Hoodie gris",
          description:
            "Hoodie chaud et confortable, parfait pour les journées fraîches",
          stock: 10,
          price: 60,
          sale: 15,
          finalPrice: 51,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/059/590/339/small/white-hoodie-mockup-apparel-modern-design-fashion-cut-out-transparent-png.png",
          categoryId: 2,
        },
        {
          name: "Hoodie noir",
          description:
            "Hoodie oversize tendance, coupe ample et style urbain affirmé",
          stock: 8,
          price: 65,
          sale: 0,
          finalPrice: 65,
          idle: false,
          imageUrl:
            "https://png.pngtree.com/png-vector/20250101/ourmid/pngtree-casual-black-hoodie-clothing-transparent-background-png-image_14931026.png",
          categoryId: 2,
        },
        {
          name: "Crewneck beige",
          description:
            "Crewneck au style épuré et minimaliste, tissu doux et résistant",
          stock: 12,
          price: 50,
          sale: 10,
          finalPrice: 45,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/058/042/980/small/cozy-beige-sweatshirt-with-a-relaxed-fit-for-casual-wear-png.png",
          categoryId: 2,
        },

        // Fournitures scolaires
        {
          name: "Sac à dos",
          description:
            "Sac à dos solide et spacieux, idéal pour transporter livres et matériel",
          stock: 7,
          price: 80,
          sale: 25,
          finalPrice: 60,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/022/149/282/small/school-backpack-isolated-png.png",
          categoryId: 4,
        },
        {
          name: "Cahier spiral",
          description:
            "Cahier spiralé de 200 pages, couverture rigide et papier quadrillé",
          stock: 50,
          price: 5,
          sale: 0,
          finalPrice: 5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/052/645/366/small/plain-cover-spiral-notebook-on-table-isolated-transparent-png.png",
          categoryId: 4,
        },
        {
          name: "Stylos pack",
          description:
            "Lot de 10 stylos à bille, écriture fluide en bleu et noir",
          stock: 40,
          price: 10,
          sale: 0,
          finalPrice: 10,
          idle: false,
          imageUrl:
            "https://pics.clipartpng.com/Metal_Cup_with_Pens_PNG_Clip_Art-1271.png",
          categoryId: 4,
        },
        {
          name: "Crayons HB",
          description:
            "Boîte de 12 crayons HB, mine solide et écriture précise",
          stock: 35,
          price: 7,
          sale: 0,
          finalPrice: 7,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/036/054/050/small/ai-generated-collection-of-back-to-school-crayons-colorful-pencil-set-loosely-arranged-on-isolated-on-a-transparent-background-png.png",
          categoryId: 4,
        },
        {
          name: "Étui scolaire",
          description:
            "Étui à crayons spacieux avec fermeture éclair et compartiments pratiques",
          stock: 25,
          price: 15,
          sale: 0,
          finalPrice: 15,
          idle: false,
          imageUrl:
            "https://png.pngtree.com/png-vector/20240207/ourmid/pngtree-blue-school-case-writing-instrument-yellow-isolated-png-image_11640507.png",
          categoryId: 4,
        },

        // Alimentation
        {
          name: "Pomme",
          description:
            "Pomme rouge croquante, fraîche et sucrée, cultivée localement",
          stock: 100,
          price: 1.5,
          sale: 0,
          finalPrice: 1.5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/035/197/712/small/ai-generated-red-apple-isolated-on-transparent-background-free-png.png",
          categoryId: 3,
        },
        {
          name: "Banane",
          description:
            "Banane mûre à point, riche en potassium et parfaite en collation",
          stock: 120,
          price: 1,
          sale: 0,
          finalPrice: 1,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/013/352/748/small/bunch-of-bananas-png.png",
          categoryId: 3,
        },
        {
          name: "Sandwich jambon",
          description:
            "Sandwich au jambon prêt à manger, garni de fromage et de laitue",
          stock: 20,
          price: 7,
          sale: 0,
          finalPrice: 7,
          idle: false,
          isCooked: true,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/041/277/335/small/ai-generated-sandwich-with-ham-cheese-tomatoes-and-lettuce-isolated-on-transparent-background-png.png",
          categoryId: 3,
        },
        {
          name: "Salade César",
          description:
            "Salade César fraîche avec croûtons, parmesan et vinaigrette maison",
          stock: 15,
          price: 9,
          sale: 0,
          finalPrice: 9,
          isCooked: true,
          idle: false,
          imageUrl:
            "https://png.pngtree.com/png-vector/20241122/ourmid/pngtree-fresh-caesar-salad-with-juicy-grilled-chicken-strips-png-image_14407381.png",
          categoryId: 3,
        },
        {
          name: "Barre protéinée",
          description:
            "Barre protéinée au chocolat, riche en protéines pour un regain d'énergie",
          stock: 60,
          price: 3.5,
          sale: 0,
          finalPrice: 3.5,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/pingpod/images/f_auto,q_auto/v1670637403/E-commerce/pod-shop/gatorade-bar-shop/gatorade-bar-shop.png?_i=AA",
          categoryId: 3,
        },
        {
          name: "Jus orange",
          description:
            "Jus d'orange 100% pur, sans sucre ajouté, format 200 ml",
          stock: 45,
          price: 3,
          sale: 0,
          finalPrice: 3,
          idle: false,
          imageUrl:
            "https://www.aubut.ca/pictures/products/large/16691_jus-dorange-pur-a-100-sans-pulpe.png",
          categoryId: 3,
        },
        {
          name: "Eau bouteille",
          description:
            "Eau de source pure en format 200 ml, idéale pour l'école",
          stock: 80,
          price: 1.5,
          sale: 0,
          finalPrice: 1.5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/049/632/650/small/a-single-plastic-water-bottle-with-a-transparent-background-png.png",
          categoryId: 3,
        },
        {
          name: "Chips BBQ",
          description:
            "Chips croustillantes à saveur BBQ fumée, format collation",
          stock: 30,
          price: 4,
          sale: 0,
          finalPrice: 4,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/054/315/052/non_2x/bag-of-frito-lay-barbecue-potato-chips-free-png.png",
          categoryId: 3,
        },
        {
          name: "Yogourt vanille",
          description:
            "Yogourt crémeux à la vanille, source de calcium et de protéines",
          stock: 40,
          price: 2.5,
          sale: 0,
          finalPrice: 2.5,
          idle: false,
          imageUrl: "https://pngimg.com/d/yogurt_PNG15164.png",
          categoryId: 3,
        },
        {
          name: "Café glacé",
          description:
            "Café froid prêt à boire, légèrement sucré avec lait, format pratique",
          stock: 25,
          price: 4.5,
          sale: 0,
          finalPrice: 4.5,
          idle: false,
          imageUrl:
            "https://dojwn62xby8qn.cloudfront.net/public/media/offer_slide_images/38950-1774355000514.png",
          categoryId: 3,
        },
        {
          name: "Lait chocolat",
          description:
            "Lait au chocolat onctueux format 500 ml, riche en calcium",
          stock: 36,
          price: 3,
          sale: 0,
          finalPrice: 3,
          idle: false,
          imageUrl:
            "https://beatrice.ca/static/wp-content/uploads/updates/chocolate-milk-473ml-jug-qc-fr-thumb.png",
          categoryId: 3,
        },
        {
          name: "Jus pomme",
          description:
            "Jus de pomme naturel format 1 L, sans colorants ni agents de conservation",
          stock: 34,
          price: 4,
          sale: 0,
          finalPrice: 4,
          idle: false,
          imageUrl:
            "https://www.maisonreignier.com/wp-content/uploads/2020/08/jus-pomme-25l.png",
          categoryId: 3,
        },
        {
          name: "Boisson gazeuse cola",
          description:
            "Boisson gazeuse cola pétillante format 355 ml, canette froide",
          stock: 55,
          price: 2,
          sale: 0,
          finalPrice: 2,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/036/573/453/small/a-can-of-coca-cola-drink-isolated-free-png.png",
          categoryId: 3,
        },
        {
          name: "Yogourt fraise",
          description:
            "Yogourt à la fraise format 650 g, onctueux et savoureux pour toute la famille",
          stock: 24,
          price: 5,
          sale: 0,
          finalPrice: 5,
          idle: false,
          imageUrl:
            "https://image.migros.ch/d/original/d357c48312173e45941ba334e9504767b29e38b4/bifidus-yogourt-fraise.png",
          categoryId: 3,
        },
        {
          name: "Pain baguette",
          description:
            "Baguette croustillante de 675 g, cuite du jour, croûte dorée et mie moelleuse",
          stock: 30,
          price: 3,
          sale: 0,
          finalPrice: 3,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/035/715/799/small/ai-generated-baguette-on-transparent-background-image-png.png",
          categoryId: 3,
        },
        {
          name: "Bagels nature",
          description:
            "Pack de 6 bagels nature moelleux, parfaits pour le déjeuner ou le lunch",
          stock: 22,
          price: 4,
          sale: 0,
          finalPrice: 4,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/021/665/580/small/fresh-tasty-hot-bagel-cutout-png.png",
          categoryId: 3,
        },
        {
          name: "Croissants",
          description:
            "Pack de 2 croissants feuilletés dorés, tendres et fondants en bouche",
          stock: 20,
          price: 5.5,
          sale: 0,
          finalPrice: 5.5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/052/969/558/small/delicious-fresh-croissants-free-png.png",
          categoryId: 3,
        },
        {
          name: "Muffins aux bleuets",
          description:
            "Muffin généreux aux bleuets frais, moelleux et parfumé, fait maison",
          stock: 19,
          price: 6,
          sale: 0,
          finalPrice: 6,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/054/269/593/non_2x/blueberry-muffin-isolated-on-a-transparent-background-free-png.png",
          categoryId: 3,
        },
        {
          name: "Pâtes spaghetti",
          description:
            "Spaghetti de blé dur format 900 g, cuisson rapide et texture al dente",
          stock: 33,
          price: 2.5,
          sale: 0,
          finalPrice: 2.5,
          isCooked: true,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/050/739/422/small/spaghetti-with-tomato-sauce-isolate-on-transparency-background-png.png",
          categoryId: 3,
        },
        {
          name: "Soupe poulet nouilles",
          description:
            "Soupe réconfortante au poulet et aux nouilles format 540 ml, prête en minutes",
          stock: 35,
          price: 3,
          sale: 0,
          finalPrice: 3,
          isCooked: true,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/059/216/733/non_2x/bowl-of-chicken-noodle-soup-with-carrots-and-peas-meal-isolated-on-transparent-background-free-png.png",
          categoryId: 3,
        },
        {
          name: "Thon en conserve",
          description:
            "Thon en conserve format 170 g, riche en protéines et pratique pour les lunchs",
          stock: 38,
          price: 2.5,
          sale: 0,
          finalPrice: 2.5,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 3,
        },
        {
          name: "Barres granola",
          description:
            "Boîte de 40 barres granola aux petits fruits, collation saine et rassasiante",
          stock: 37,
          price: 4.5,
          sale: 0,
          finalPrice: 4.5,
          idle: false,
          imageUrl:
            "https://www.madegoodfoods.ca/cdn/shop/files/MGCN_DIGITAL_ECOM_GRANOLABARS_MIXEDBERRY_FR_40x_2000x2000_0125.png?v=1752244760&width=1200",
          categoryId: 3,
        },
        {
          name: "Barre protéinée chocolat",
          description:
            "Barre protéinée intense au chocolat, idéale après l'effort ou en collation",
          stock: 42,
          price: 3.5,
          sale: 0,
          finalPrice: 3.5,
          idle: false,
          imageUrl:
            "https://www.gerlinea.fr/media/catalog/product/3/1/3175681298521_front_fr_FR_d55c.png?optimize=medium&fit=bounds&height=&width=",
          categoryId: 3,
        },
        {
          name: "Chips nature",
          description:
            "Chips dorées au goût naturel format 200 g, légèrement salées et croustillantes",
          stock: 30,
          price: 4,
          sale: 0,
          finalPrice: 4,
          idle: false,
          imageUrl:
            "https://www.lays.fr/prod/s3fs-public/2025-11/lays%20ancienne%20nature%20155.png",
          categoryId: 3,
        },
        {
          name: "Biscuits chocolat",
          description:
            "Biscuits aux pépites de chocolat format 300 g, fondants et irrésistibles",
          stock: 26,
          price: 4,
          sale: 0,
          finalPrice: 4,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/069/416/000/small/box-of-chocolate-chip-cookies-isolated-on-transparent-background-png.png",
          categoryId: 3,
        },
        {
          name: "Craquelins",
          description:
            "Craquelins dorés et croquants format 250 g, parfaits avec fromage ou houmous",
          stock: 21,
          price: 4,
          sale: 0,
          finalPrice: 4,
          idle: false,
          imageUrl:
            "https://i5.walmartimages.com/asr/1e315b7c-58fa-4808-ba67-6a559f77e664.2df19bf1da33e29748104d54c4754c18.png?odnHeight=612&odnWidth=612&odnBg=FFFFFF",
          categoryId: 3,
        },
        {
          name: "Popcorn micro-ondes",
          description:
            "Pack de 3 sachets de popcorn micro-ondes, prêts en 3 minutes",
          stock: 24,
          price: 4.5,
          sale: 0,
          finalPrice: 4.5,
          idle: false,
          imageUrl:
            "https://dojwn62xby8qn.cloudfront.net/public/media/offer_products/42574-1756133587451.png",
          categoryId: 3,
        },
        {
          name: "Oranges",
          description:
            "Sac de 2 lb d'oranges juteuses et vitaminées, idéales en collation",
          stock: 22,
          price: 5,
          sale: 0,
          finalPrice: 5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/059/319/941/small_2x/vibrant-oranges-in-red-mesh-bag-on-transparent-background-png.png",
          categoryId: 3,
        },
        {
          name: "Wrap poulet césar",
          description:
            "Wrap au poulet grillé et sauce césar, frais et généreux, prêt à manger",
          stock: 15,
          price: 8,
          sale: 0,
          isCooked: true,
          finalPrice: 8,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/048/930/603/non_2x/caesar-wrap-grilled-chicken-isolated-on-transparent-background-free-png.png",
          categoryId: 3,
        },
        {
          name: "Pizza congelée",
          description:
            "Pizza congelée deluxe 12 po garnie de fromage, légumes et viande",
          stock: 19,
          price: 9,
          sale: 15,
          finalPrice: 7.65,
          idle: false,
          isCooked: true,
          imageUrl:
            "https://png.pngtree.com/png-vector/20241211/ourmid/pngtree-authentic-italian-pizza-with-cheese-and-fresh-vegetable-toppings-png-image_14714611.png",
          categoryId: 3,
        },
        {
          name: "Crème glacée vanille",
          description:
            "Crème glacée à la vanille onctueuse format 1,5 L, pour toute la famille",
          stock: 13,
          price: 7,
          sale: 10,
          finalPrice: 6.3,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/065/420/482/small/delicious-ice-cream-cone-topped-with-caramel-swirl-and-whipped-cream-png.png",
          categoryId: 3,
        },
        {
          name: "Crème glacée chocolat",
          description:
            "Crème glacée au chocolat intense format 1,5 L, riche et crémeuse",
          stock: 12,
          price: 7,
          sale: 10,
          finalPrice: 6.3,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/013/442/044/non_2x/chocolate-ice-cream-free-png.png",
          categoryId: 3,
        },
        {
          name: "Noix mélangées",
          description:
            "Mélange de noix variées format 300 g, non salées et riches en bons gras",
          stock: 16,
          price: 7.5,
          sale: 0,
          finalPrice: 7.5,
          idle: false,
          imageUrl:
            "https://krispykernels.com/media/1635/64210-06460-nm-non-salees_unsalted.png?anchor=center&mode=crop&width=720&height=1200&rnd=133820383620000000",
          categoryId: 3,
        },
        {
          name: "Bonbons fruités",
          description:
            "Bonbons gélatineux aux fruits format 200 g, saveurs variées et colorées",
          stock: 28,
          price: 3,
          sale: 0,
          finalPrice: 3,
          idle: false,
          imageUrl:
            "https://assets.haribo.com/image/upload/s--UqwITL7F--/ar_3310:4000,c_fill,f_auto,q_60/w_753/v1/consumer-sites/de-at/Products/HARIBO/Goldbaeren-175g.png",
          categoryId: 3,
        },
        {
          name: "Gomme à mâcher",
          description:
            "Pack de 12 gommes à mâcher, longue durée de saveur et fraîcheur garantie",
          stock: 44,
          price: 2,
          sale: 0,
          finalPrice: 2,
          idle: false,
          imageUrl:
            "https://www.excelgum.ca/sites/g/files/fnmzdf1531/files/migrate-product-files/dugdwcnhonbcqkdytp3t.png",
          categoryId: 3,
        },

        // Vêtements
        {
          name: "T-shirt marine",
          description:
            "T-shirt bleu marine à coupe classique, tissu coton respirant toute saison",
          stock: 20,
          price: 25,
          sale: 0,
          finalPrice: 25,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/072/880/225/small/plain-blue-t-shirt-isolated-on-transparent-background-png.png",
          categoryId: 2,
        },
        {
          name: "Chandail manches longues",
          description:
            "Chandail à manches longues en coton respirant, parfait entre deux saisons",
          stock: 16,
          price: 35,
          sale: 0,
          finalPrice: 35,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/019/617/291/small/long-sleeve-t-shirt-png.png",
          categoryId: 2,
        },
        {
          name: "Polo noir",
          description:
            "Polo noir en tissu piqué élégant, coupe ajustée pour un look soigné",
          stock: 14,
          price: 40,
          sale: 0,
          finalPrice: 40,
          idle: false,
          imageUrl:
            "https://png.pngtree.com/png-vector/20240202/ourmid/pngtree-black-polo-t-shirt-mockup-png-image_11588643.png",
          categoryId: 2,
        },
        {
          name: "Polo blanc",
          description:
            "Polo blanc au style propre et intemporel, tissu piqué de qualité supérieure",
          stock: 15,
          price: 40,
          sale: 0,
          finalPrice: 40,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/055/183/235/small/plain-white-short-sleeved-polo-shirt-png.png",
          categoryId: 2,
        },
        {
          name: "Chemise noire",
          description:
            "Chemise noire à coupe ajustée, idéale pour une tenue décontractée chic",
          stock: 12,
          price: 50,
          sale: 30,
          finalPrice: 35,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/070/047/533/small/office-wear-shirt-free-png.png",
          categoryId: 2,
        },
        {
          name: "Chemise blanche",
          description:
            "Chemise blanche à manches longues, coupe classique et tissu sans froissage",
          stock: 13,
          price: 53,
          sale: 0,
          finalPrice: 53,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/058/666/687/small/classic-white-long-sleeve-dress-shirt-mockup-for-men-free-png.png",
          categoryId: 2,
        },
        {
          name: "Chemise carreautée",
          description:
            "Chemise à carreaux style casual, tissu flanelle doux et chaleureux",
          stock: 11,
          price: 55,
          sale: 20,
          finalPrice: 44,
          idle: false,
          imageUrl:
            "https://png.pngtree.com/png-vector/20251204/ourmid/pngtree-red-and-black-plaid-flannel-shirt-for-men-png-image_18098153.webp",
          categoryId: 2,
        },
        {
          name: "Hoodie beige",
          description:
            "Hoodie beige au style minimaliste et épuré, tissu doux et confortable",
          stock: 15,
          price: 63,
          sale: 0,
          finalPrice: 63,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/060/301/977/non_2x/beige-hoodie-mockup-free-png.png",
          categoryId: 2,
        },
        {
          name: "Veste zippée",
          description:
            "Veste zippée en tissu doux et chaud, coupe droite pour un port quotidien",
          stock: 10,
          price: 70,
          sale: 15,
          finalPrice: 59.5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/065/444/724/small/a-white-sweatshirt-with-a-zipper-on-the-front-png.png",
          categoryId: 2,
        },
        {
          name: "Jogging noir",
          description:
            "Pantalon de jogging noir confortable, taille élastique et tissu respirant",
          stock: 18,
          price: 45,
          sale: 0,
          finalPrice: 45,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/037/752/616/small/ai-generated-black-fabric-pants-without-background-ready-for-mockup-png.png",
          categoryId: 2,
        },
        {
          name: "Jogging gris",
          description:
            "Pantalon de jogging gris à taille élastique et cordon ajustable",
          stock: 20,
          price: 43,
          sale: 0,
          finalPrice: 43,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/077/908/781/small/light-grey-toddler-jogger-pants-with-drawstring-free-png.png",
          categoryId: 2,
        },
        {
          name: "Pantalon cargo",
          description:
            "Pantalon cargo avec poches latérales pratiques, coupe décontractée et robuste",
          stock: 12,
          price: 60,
          sale: 0,
          finalPrice: 60,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/051/125/702/small_2x/men-s-cargo-pants-in-beige-free-png.png",
          categoryId: 2,
        },
        {
          name: "Jean bleu",
          description:
            "Jean bleu classique à coupe droite, denim résistant et confortable",
          stock: 14,
          price: 65,
          sale: 0,
          finalPrice: 65,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/066/198/638/small/classic-straight-leg-blue-denim-jeans-png.png",
          categoryId: 2,
        },
        {
          name: "Jean noir",
          description:
            "Jean noir au style urbain moderne, coupe ajustée et tissu stretch",
          stock: 13,
          price: 67,
          sale: 0,
          finalPrice: 67,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/067/050/386/non_2x/black-jeans-trouser-isolated-on-transparent-background-free-png.png",
          categoryId: 2,
        },
        {
          name: "Casquette noire",
          description:
            "Casquette noire ajustable, visière rigide et broderie discrète au devant",
          stock: 26,
          price: 20,
          sale: 0,
          finalPrice: 20,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/055/391/524/small/black-baseball-cap-mockup-plain-design-template-free-png.png",
          categoryId: 2,
        },
        {
          name: "Casquette blanche",
          description:
            "Casquette blanche à visière courbée, légère et idéale pour l'été",
          stock: 24,
          price: 19,
          sale: 0,
          finalPrice: 19,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/057/074/122/small/a-simple-white-baseball-cap-free-png.png",
          categoryId: 2,
        },
        {
          name: "Tuque grise",
          description:
            "Tuque en maille douce et extensible, maintien chaud par temps froid",
          stock: 18,
          price: 22,
          sale: 0,
          finalPrice: 22,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/057/575/685/small/extraordinary-rustic-gray-beanie-with-pom-pom-with-transparent-background-professional-free-png.png",
          categoryId: 2,
        },
        {
          name: "Portefeuille noir",
          description:
            "Portefeuille en similicuir noir, plusieurs compartiments pour cartes et billets",
          stock: 18,
          price: 30,
          sale: 20,
          finalPrice: 24,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/035/940/329/small/ai-generated-black-leather-wallet-isolated-on-transparent-background-free-png.png",
          categoryId: 2,
        },
        {
          name: "Lunettes soleil",
          description:
            "Lunettes de soleil à verres fumés avec protection UV, monture légère",
          stock: 10,
          price: 35,
          sale: 0,
          finalPrice: 35,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/026/576/097/small/black-sunglasses-isolated-png.png",
          categoryId: 2,
        },
        {
          name: "Manteau d'hiver",
          description:
            "Manteau d'hiver à isolation légère, coupe droite et fermeture zippée",
          stock: 7,
          price: 130,
          sale: 25,
          finalPrice: 97.5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/058/325/217/small/gray-wool-blend-coat-isolated-on-transparent-background-png.png",
          categoryId: 2,
        },
        {
          name: "Veste en jean",
          description:
            "Veste en denim au style classique intemporel, poches avant et boutons métal",
          stock: 9,
          price: 80,
          sale: 0,
          finalPrice: 80,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/048/778/699/non_2x/denim-jacket-on-transparent-background-ai-generative-free-png.png",
          categoryId: 2,
        },
        {
          name: "Pantalon habillé",
          description:
            "Pantalon habillé à coupe droite, tissu structuré idéal pour les occasions formelles",
          stock: 11,
          price: 59,
          sale: 0,
          finalPrice: 59,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/057/716/518/small/neatly-pressed-and-tailored-navy-blue-trousers-for-formal-or-casual-wear-png.png",
          categoryId: 2,
        },
        {
          name: "Chaussures sport",
          description:
            "Chaussures de sport polyvalentes pour un usage quotidien, semelle amortissante",
          stock: 9,
          price: 90,
          sale: 20,
          finalPrice: 72,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/036/575/605/small/puma-black-sneakers-isolated-png.png",
          categoryId: 2,
        },
        {
          name: "Sandales",
          description:
            "Sandales légères à semelle souple, confortables pour les journées estivales",
          stock: 13,
          price: 30,
          sale: 0,
          finalPrice: 30,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 2,
        },

        // Fournitures scolaires
        {
          name: "Cahier ligné",
          description:
            "Cahier ligné de 200 pages, couverture souple et reliure solide",
          stock: 60,
          price: 5,
          sale: 0,
          finalPrice: 5,
          idle: false,
          imageUrl:
            "https://scolaire.editionsvaudreuil.ca/web/image/product.product/46532/image_1920?unique=c444473",
          categoryId: 4,
        },
        {
          name: "Cahier quadrillé",
          description:
            "Cahier quadrillé de 200 pages, idéal pour mathématiques et sciences",
          stock: 45,
          price: 5.5,
          sale: 0,
          finalPrice: 5.5,
          idle: false,
          imageUrl: "https://www.coopoly.ca/photos/completes/244223.jpg",
          categoryId: 4,
        },
        {
          name: "Cartable 1 pouce",
          description:
            "Cartable format lettre 1 pouce, anneaux résistants et couverture rigide",
          stock: 28,
          price: 7,
          sale: 0,
          finalPrice: 7,
          idle: false,
          imageUrl:
            "https://amisdetourterelle.ca/cdn/shop/products/Zcoop_cartable-plastique-bleu_506x.png?v=1617983572",
          categoryId: 4,
        },
        {
          name: "Cartable 2 pouces",
          description:
            "Cartable format lettre 2 pouces, grande capacité pour organiser vos documents",
          stock: 22,
          price: 9,
          sale: 0,
          finalPrice: 9,
          idle: false,
          imageUrl:
            "https://amisdetourterelle.ca/cdn/shop/products/Zcoop_cartable-plastique-rouge_1200x1200.png?v=1617983572",
          categoryId: 4,
        },
        {
          name: "Pochette plastique",
          description:
            "Pack de 10 pochettes plastiques transparentes, format lettre et résistantes",
          stock: 36,
          price: 4,
          sale: 0,
          finalPrice: 4,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Stylo rouge",
          description:
            "Stylo bille rouge à encre fluide, idéal pour corrections et annotations",
          stock: 72,
          price: 1.5,
          sale: 0,
          finalPrice: 1.5,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Crayons de couleur",
          description:
            "Boîte de 12 crayons de couleur vifs, mine solide et facile à tailler",
          stock: 30,
          price: 7,
          sale: 0,
          finalPrice: 7,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/012/300/030/small/colored-pencils-isolated-png.png",
          categoryId: 4,
        },
        {
          name: "Surligneurs",
          description:
            "Pack de 4 surligneurs fluorescents, pointe biseautée et encre longue durée",
          stock: 29,
          price: 5.5,
          sale: 0,
          finalPrice: 5.5,
          idle: false,
          imageUrl:
            "https://png.pngtree.com/png-vector/20231127/ourmid/pngtree-highlighter-pen-highlighters-png-image_10731273.png",
          categoryId: 4,
        },
        {
          name: "Gomme à effacer",
          description:
            "Gomme blanche douce qui efface proprement sans abîmer le papier",
          stock: 70,
          price: 1,
          sale: 0,
          finalPrice: 1,
          idle: false,
          imageUrl:
            "https://png.pngtree.com/png-vector/20250429/ourmid/pngtree-biey-dscmtane-eraser-png-image_16127651.png",
          categoryId: 4,
        },
        {
          name: "Règle",
          description:
            "Règle transparente graduée de 30 cm, bords lisses et résistante aux chocs",
          stock: 46,
          price: 2.5,
          sale: 0,
          finalPrice: 2.5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/021/275/530/small/pink-rule-isolated-on-a-transparent-background-png.png",
          categoryId: 4,
        },
        {
          name: "Taille-crayon",
          description:
            "Taille-crayon avec réservoir intégré, double taille et lame acier inoxydable",
          stock: 33,
          price: 3,
          sale: 0,
          finalPrice: 3,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Clé USB 32GB",
          description:
            "Clé USB 3.0 de 32 Go, transfert rapide et boîtier métal compact et robuste",
          stock: 20,
          price: 15,
          sale: 20,
          finalPrice: 12,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/059/983/349/small/captivating-celebrated-usb-flash-drive-with-metal-casing-no-background-with-transparent-background-free-png.png",
          categoryId: 4,
        },
        {
          name: "Calculatrice scientifique",
          description:
            "Calculatrice scientifique à affichage 2 lignes, fonctions avancées pour le secondaire",
          stock: 16,
          price: 25,
          sale: 20,
          finalPrice: 20,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/015/123/653/small/realistic-calculator-isolated-png.png",
          categoryId: 4,
        },
        {
          name: "Agenda scolaire",
          description:
            "Agenda scolaire 12 mois avec sections hebdomadaires, couverture souple colorée",
          stock: 21,
          price: 10,
          sale: 0,
          finalPrice: 10,
          idle: false,
          imageUrl:
            "https://laurentien.ca/wp-content/uploads/2026/02/Autocollants.png",
          categoryId: 4,
        },
        {
          name: "Trombones",
          description:
            "Boîte de 100 trombones métalliques format standard, résistants et réutilisables",
          stock: 41,
          price: 2,
          sale: 0,
          finalPrice: 2,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Agrafeuse",
          description:
            "Agrafeuse format bureau à mécanisme fluide, capacité 20 feuilles",
          stock: 19,
          price: 9,
          sale: 0,
          finalPrice: 9,
          idle: false,
          imageUrl:
            "https://www.pngarts.com/files/6/Stapler-Transparent-Image.png",
          categoryId: 4,
        },
        {
          name: "Agrafes",
          description:
            "Boîte de 5000 agrafes standard 26/6, compatibles avec la majorité des agrafeuses",
          stock: 22,
          price: 4,
          sale: 0,
          finalPrice: 4,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Bâton de colle",
          description:
            "Bâton de colle de 21 g, séchage rapide, sans odeur et lavable",
          stock: 35,
          price: 2.5,
          sale: 0,
          finalPrice: 2.5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/027/243/914/small/open-paper-glue-stick-3d-illustration-png.png",
          categoryId: 4,
        },
        {
          name: "Ruban adhésif",
          description:
            "Ruban adhésif transparent repositionnable, coupe facile et laisse peu de traces",
          stock: 31,
          price: 3,
          sale: 0,
          finalPrice: 3,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/072/431/902/small/yellow-sticky-adhesive-tape-roll-png.png",
          categoryId: 4,
        },
        {
          name: "Ciseaux",
          description:
            "Ciseaux scolaires à lames inox, poignées ergonomiques pour droitiers et gauchers",
          stock: 26,
          price: 5,
          sale: 0,
          finalPrice: 5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/015/310/756/small/pink-scissors-with-transparent-background-free-png.png",
          categoryId: 4,
        },
        {
          name: "Dictionnaire français",
          description:
            "Dictionnaire français édition scolaire, définitions claires et exemples d'usage",
          stock: 12,
          price: 20,
          sale: 20,
          finalPrice: 16,
          idle: false,
          imageUrl:
            "https://m.media-amazon.com/images/I/81t31+xceCL._AC_UF1000,1000_QL80_.jpg",
          categoryId: 4,
        },
        {
          name: "Dictionnaire anglais",
          description:
            "Dictionnaire anglais édition scolaire, bilingue avec traductions et phonétique",
          stock: 11,
          price: 22,
          sale: 0,
          finalPrice: 22,
          idle: false,
          imageUrl:
            "https://wallpapers.com/images/hd/oxford-english-dictionary-cover-zx3ka1wlzxaidclf.jpg",
          categoryId: 4,
        },
        {
          name: "Livre de biologie",
          description:
            "Manuel de biologie sur le corps humain, illustrations détaillées et exercices inclus",
          stock: 7,
          price: 39,
          sale: 0,
          finalPrice: 39,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Livre d'histoire",
          description:
            "Manuel sur l'histoire du Québec, chronologie complète et documents d'archives",
          stock: 13,
          price: 30,
          sale: 0,
          finalPrice: 30,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Guide de rédaction",
          description:
            "Guide de méthodologie pour la rédaction scolaire, étapes claires et exemples concrets",
          stock: 14,
          price: 19,
          sale: 0,
          finalPrice: 19,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Livre d'anglais",
          description:
            "Manuel de conversation anglaise pour débutants, dialogues et exercices pratiques",
          stock: 13,
          price: 24,
          sale: 0,
          finalPrice: 24,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Livre d'espagnol",
          description:
            "Manuel d'espagnol pour débutants, vocabulaire illustré et exercices de prononciation",
          stock: 10,
          price: 23,
          sale: 0,
          finalPrice: 23,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Lampe de bureau",
          description:
            "Lampe de bureau DEL à intensité ajustable, bras flexible et économe en énergie",
          stock: 14,
          price: 30,
          sale: 15,
          finalPrice: 25.5,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/thumbnails/037/369/649/small/modern-desk-lamp-isolated-on-background-3d-rendering-illustration-free-png.png",
          categoryId: 4,
        },
        {
          name: "Support pour ordinateur",
          description:
            "Support pliable pour ordinateur portable, hauteur ajustable et ventilation optimisée",
          stock: 12,
          price: 28,
          sale: 0,
          finalPrice: 28,
          idle: false,
          imageUrl:
            "https://res.cloudinary.com/dnz7fsota/image/upload/w_500,h_500,c_fit,f_webp/v1775695397/ChatGPT_Image_8_avr._2026_20_h_41_min_38_s_c91z4f.png",
          categoryId: 4,
        },
        {
          name: "Soupe de poulet",
          description: "Une bonne soupe de poulet",
          stock: 6,
          price: 14,
          sale: 0,
          finalPrice: 14,
          isCooked: true,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/049/736/155/non_2x/white-bowl-of-carrot-and-chicken-soup-on-transparent-background-free-png.png",
          categoryId: 4,
        },
        {
          name: "Soupe de tomate",
          description: "Une bonne soupe de tomate",
          stock: 8,
          price: 14,
          sale: 0,
          finalPrice: 14,
          isCooked: true,
          idle: false,
          imageUrl:
            "https://static.vecteezy.com/system/resources/previews/067/335/291/non_2x/delicious-tomato-soup-in-white-bowl-isolated-on-a-transparent-background-free-png.png",
          categoryId: 4,
        },
        {
          name: "Pancake",
          description: "Un lot de 2 pancakes",
          stock: 4,
          price: 12,
          sale: 10,
          finalPrice: 10.8,
          isCooked: true,
          idle: false,
          imageUrl: "https://pngimg.com/d/pancake_PNG108.png",
          categoryId: 4,
        },
      ].map((product) => ({
        ...product,
        finalPrice:
          Math.round(product.price * (1 - (product.sale ?? 0) / 100) * 100) /
          100,
      })),
    });
    await prisma.faqItem.createMany({
      data: [
        {
          question: "Combien coûte le prix de la livraison ?",
          answer: "La livraison est gratuite pour l'entièreté du cégep.",
          keywords: ["livraison", "prix", "commande", "payant"],
          category: CategoryNameFaq.LIVRAISON,
        },
        {
          question: "Comment puis-je changer mes informations de compte ?",
          answer:
            "Vous pouvez changer vos informations de compte dans votre profil, en cliquant sur votre photo de profil en haut de la page.",
          keywords: [
            "changer",
            "informations",
            "compte",
            "profil",
            "modifier",
            "mettre à jour",
          ],
          category: CategoryNameFaq.PROFIL,
        },
        {
          question: "Comment puis-je annuler ma commande ?",
          answer:
            "Vous pouvez annuler votre commande en cliquant sur le bouton 'Annuler' sur la page de votre commande si celui-ci n'est pas encore en préparation ou qu'elle n'a pas été créer il y'a plus de 15 minutes.",
          keywords: [
            "annuler",
            "commande",
            "bouton",
            "retour",
            "annulation",
            "remboursement",
            "cancel",
          ],
          category: CategoryNameFaq.COMMANDES,
        },
        {
          question: "Comment puis-je voir l'historique de mes commandes ?",
          answer:
            "Vous pouvez voir l'historique de vos commandes dans la liste des transactions, en cliquant sur votre photo de profil en haut de la page puis sur 'Mes transactions'.",
          keywords: ["historique", "commandes", "profil", "onglet"],
          category: CategoryNameFaq.COMMANDES,
        },
        {
          question: "Comment puis-je être au courant des promotions en cours ?",
          answer:
            "Vous pouvez être au courant des promotions en cours en suivant les annonces sur la page d'accueil ou via la page des produits",
          keywords: ["promotions", "annonces", "liste", "accueil", "rabais"],
          category: CategoryNameFaq.PROMOTIONS,
        },
        {
          question: "Quel est le principe du site ?",
          answer:
            "Le site vous permet de commander des produits en ligne et de suivre vos commandes.",
          keywords: ["site", "commander", "suivre", "produits", "ligne"],
          category: CategoryNameFaq.AUTRE,
        },
        {
          question: "Comment puis-je rejoindre le support en ligne ?",
          answer:
            "Nous vous invitons à visiter la page FAQ, si jamais vous ne trouvez pas votre réponse nM'hésitez à nous contactex via courriel : monpetituber@égmail.com",
          keywords: ["site", "aide", "support", "FAQ", "ligne"],
          category: CategoryNameFaq.AUTRE,
        },
      ],
    });

    // prendre 5 clients
    const users = await prisma.user.findMany({
      where: { role: "user" },
      take: 5,
    });

    const products = await prisma.product.findMany();

    // choisir à l'hazard des produits
    function getRandomItems() {
      const shuffled = [...products].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.floor(Math.random() * 3) + 1);

      return selected.map((product) => {
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = product.finalPrice;

        return {
          productId: product.id,
          quantity,
          price,
        };
      });
    }

    // helper random
    function randomFrom<T>(array: T[]): T {
      if (!array.length) {
        throw new Error("Array is empty");
      }

      return array[Math.floor(Math.random() * array.length)]!;
    }

    // prendre 5 clients
    const employees = await prisma.user.findMany({
      where: { role: "employe" },
      take: 5,
    });

    // Générer un nombre aléatoire de transactions par client
    for (const user of users) {
      const nbTransactions = Math.floor(Math.random() * 56) + 5; // entre 5 et 60 inclus
      for (let i = 0; i < nbTransactions; i++) {
        const itemsData = getRandomItems();
        const total = itemsData.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        let purchaseDate = new Date(
          Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30),
        );

        // heure aléatoire entre 9h et 22h
        const randomHour = Math.floor(Math.random() * (22 - 9 + 1)) + 9;

        // minutes aléatoires
        const randomMinute = Math.floor(Math.random() * 60);

        purchaseDate.setHours(randomHour, randomMinute, 0, 0);

        // type random
        const commandeType = Math.random() > 0.5 ? "LIVRAISON" : "PICKUP";

        // générer des commandes deja complétées
        let etat: CommandeEtat = CommandeEtat.COMPLETEE;

        const randomBetween = (min: number, max: number) =>
          Math.floor(Math.random() * (max - min + 1)) + min;

        const readyDelay = randomBetween(1, 15); // le temps de preparation de 1 a 15 min
        const pickupDelay = randomBetween(5, 20); // le temps de livraison ou ramassage de 5 à 20 min
        const updateDelay = randomBetween(1, 5); // le temps de finaliser la commande de 1 à 5 min

        const transaction = await prisma.transaction.create({
          data: {
            userId: user.id,
            purchaseDate,
            paidAt: purchaseDate,
            total,

            items: {
              create: itemsData,
            },

            commande: {
              create: {
                type: commandeType,
                etat,
                createdAt: purchaseDate,

                livreurId:
                  commandeType === CommandeType.LIVRAISON
                    ? randomFrom(employees).id
                    : null,

                codeConfirmation:
                  commandeType === CommandeType.PICKUP
                    ? Math.floor(100000 + Math.random() * 900000).toString()
                    : null,

                readyForPickupAt: new Date(
                  purchaseDate.getTime() + 1000 * 60 * readyDelay,
                ),

                deliveryPickedUpAt: new Date(
                  purchaseDate.getTime() +
                    1000 * 60 * (readyDelay + pickupDelay),
                ),

                updatedAt:
                  commandeType === CommandeType.LIVRAISON
                    ? new Date(
                        purchaseDate.getTime() +
                          1000 * 60 * (readyDelay + pickupDelay + updateDelay),
                      )
                    : new Date(
                        purchaseDate.getTime() +
                          1000 * 60 * (readyDelay + pickupDelay),
                      ),

                deliveredAt:
                  commandeType === CommandeType.LIVRAISON
                    ? new Date(purchaseDate.getTime() + 1000 * 60 * (readyDelay + pickupDelay + updateDelay))
                    : null,
              },
            },
          },
        });

        // Ajouter une review pour les livraisons complétées
        if (commandeType === CommandeType.LIVRAISON) {
          const commande = await prisma.commande.findFirst({
            where: { transactionId: transaction.id },
            select: { id: true, livreurId: true },
          });

          if (commande?.livreurId) {
            await prisma.employeeReview.create({
              data: {
                rating: randomBetween(1, 5),
                comment: Math.random() > 0.5 ? "Bonne livraison !" : null,
                employeeId: commande.livreurId,
                reviewerId: user.id,
                commandeId: commande.id,
              },
            });
          }
        }
      }
    }

    // FAQ de test pour la US FAQ
    const faqSeedData = [
      {
        question: "Comment passer une commande ?",
        answer:
          'Pour passer une commande, ajoutez les produits au panier puis cliquez sur "Passer la commande" pour finaliser le paiement. Vous serez redirigé vers un mode de paiement sécurisé.',
        keywords: ["commande", "panier", "achat", "passer"],
        category: "MENU" as const,
      },
      {
        question: "Quels sont les délais de livraison ?",
        answer:
          "Les commandes en mode livraison sont généralement livrées dans un délai de 30 à 60 minutes après la finalisation de la préparation.",
        keywords: ["livraison", "délai", "temps", "attente"],
        category: "LIVRAISON" as const,
      },
      {
        question: "Puis-je venir chercher ma commande en magasin ?",
        answer:
          "Oui, lors du checkout vous pouvez choisir le mode 'Ramassage'. Un code de confirmation vous sera envoyé par courriel quand votre commande sera prête.",
        keywords: ["ramassage", "magasin", "récupérer"],
        category: "LIVRAISON" as const,
      },
      {
        question: "Quels modes de paiement acceptez-vous ?",
        answer:
          "Nous acceptons les paiements par carte de crédit (Visa, Mastercard, American Express) via la plateforme sécurisée Stripe.",
        keywords: ["paiement", "carte", "stripe", "visa", "mastercard"],
        category: "PAIEMENT" as const,
      },
      {
        question: "Comment obtenir un remboursement ?",
        answer:
          "Pour toute demande de remboursement, contactez notre service client à support@example.com. Nous traiterons votre demande dans un délai de 5 jours ouvrables.",
        keywords: ["remboursement", "retour", "annulation"],
        category: "PAIEMENT" as const,
      },
      {
        question: "Comment modifier mes informations personnelles ?",
        answer:
          "Connectez-vous à votre compte, cliquez sur votre profil en haut à droite, puis modifiez vos informations dans la section dédiée.",
        keywords: ["profil", "informations", "compte", "modifier"],
        category: "AUTRE" as const,
      },
    ];

    for (const faq of faqSeedData) {
      await prisma.faqItem.create({ data: faq });
    }

    const reviewProducts = await prisma.product.findMany({
      orderBy: { id: "asc" },
    });
    const reviewUsers = await prisma.user.findMany({
      where: { role: "user" },
      orderBy: { email: "asc" },
    });

    if (reviewUsers.length > 0) {
      const defaultReviewComments = [
        "Très bon produit, conforme à la description.",
        "Bonne qualité pour le prix, je le reprendrais.",
        "Pratique au quotidien et livré rapidement.",
      ];
      const reviewCommentsByType: Record<
        "food" | "clothing" | "school" | "electronics" | "home",
        string[]
      > = {
        food: [
          "Goût agréable et format pratique pour une collation rapide.",
          "Produit frais, bon rapport qualité-prix.",
          "Parfait pour dépanner entre deux cours.",
          "Bonne portion, l'emballage est facile à transporter.",
          "Saveur correcte, mais j'aurais aimé une portion un peu plus généreuse.",
        ],
        clothing: [
          "Coupe confortable et tissu agréable à porter.",
          "La taille correspond bien, le produit est fidèle à la photo.",
          "Bonne qualité de finition pour le prix.",
          "Confortable au quotidien et facile à agencer.",
          "Le tissu est correct, mais un peu plus épais aurait été mieux.",
        ],
        school: [
          "Très pratique pour les cours et assez solide.",
          "Bonne qualité, parfait pour une utilisation scolaire régulière.",
          "Format bien pensé, facile à ranger dans un sac.",
          "Utile au quotidien et conforme à ce que j'attendais.",
          "Fonctionne bien, même si la finition pourrait être meilleure.",
        ],
        electronics: [
          "Fonctionne bien et se configure rapidement.",
          "Produit fiable, pratique pour les travaux et les cours.",
          "Bonne performance pour le prix.",
          "Format compact et facile à transporter.",
          "Correct, mais les matériaux pourraient être plus robustes.",
        ],
        home: [
          "Pratique et facile à intégrer dans un espace de travail.",
          "Bonne qualité, le produit est stable et utile.",
          "Fait bien son travail au quotidien.",
          "Design simple et utilisation efficace.",
          "Produit correct, quelques finitions pourraient être améliorées.",
        ],
      };
      type ProductReviewType = keyof typeof reviewCommentsByType | "default";
      const productReviewRatings = [5, 4, 5, 4, 3, 5, 4, 4, 5, 3];
      const getProductReviewType = (
        productName: string,
        categoryId: number | null
      ): ProductReviewType => {
        const normalizedName = productName.toLowerCase();
        const hasKeyword = (keywords: string[]) =>
          keywords.some((keyword) => normalizedName.includes(keyword));

        if (
          hasKeyword([
            "pomme",
            "banane",
            "sandwich",
            "salade",
            "barre",
            "jus",
            "eau",
            "chips",
            "yogourt",
            "café",
            "lait",
            "boisson",
            "pain",
            "bagel",
            "croissant",
            "muffin",
            "pâtes",
            "soupe",
            "thon",
            "biscuit",
            "craquelin",
            "popcorn",
            "orange",
            "wrap",
            "pizza",
            "crème glacée",
            "noix",
            "bonbon",
            "gomme à mâcher",
            "pancake",
          ])
        ) {
          return "food";
        }

        if (
          categoryId === 1 ||
          hasKeyword(["clé usb", "ordinateur", "calculatrice"])
        ) {
          return "electronics";
        }

        if (
          hasKeyword([
            "sac à dos",
            "cahier",
            "stylo",
            "crayon",
            "étui",
            "cartable",
            "pochette",
            "surligneur",
            "gomme à effacer",
            "règle",
            "taille-crayon",
            "agenda",
            "trombone",
            "agrafeuse",
            "agrafe",
            "colle",
            "ruban",
            "ciseaux",
            "dictionnaire",
            "livre",
            "guide",
          ])
        ) {
          return "school";
        }

        if (
          categoryId === 2 ||
          hasKeyword([
            "chandail",
            "hoodie",
            "crewneck",
            "t-shirt",
            "polo",
            "chemise",
            "jogging",
            "pantalon",
            "jean",
            "casquette",
            "tuque",
            "portefeuille",
            "lunettes",
            "manteau",
            "veste",
            "chaussures",
            "sandales",
          ])
        ) {
          return "clothing";
        }

        if (hasKeyword(["lampe", "support"])) {
          return "home";
        }

        return "default";
      };
      const productReviewRows = reviewProducts.flatMap((product, productIndex) => {
        if ((productIndex + 1) % 5 === 0) {
          return [];
        }

        const reviewsCount = 2 + (productIndex % 4);
        const reviewType = getProductReviewType(product.name, product.categoryId);
        const productReviewComments =
          reviewType === "default"
            ? defaultReviewComments
            : reviewCommentsByType[reviewType];

        return Array.from({ length: reviewsCount }, (_, reviewIndex) => {
          const user =
            reviewUsers[
              (productIndex + reviewIndex * 3) % reviewUsers.length
            ]!;

          const comment =
            productReviewComments[
              (productIndex * 2 + reviewIndex) % productReviewComments.length
            ] ?? "Très bon produit, conforme à la description.";
          const rating =
            productReviewRatings[
              (productIndex + reviewIndex) % productReviewRatings.length
            ] ?? 4;

          return {
            rating,
            comment,
            imagesUrl: [],
            productId: product.id,
            userId: user.id,
            createdAt: new Date(
              Date.now() - (productIndex * reviewsCount + reviewIndex + 1) * 86_400_000
            ),
          };
        });
      });

      await prisma.productReview.createMany({
        data: productReviewRows,
        skipDuplicates: true,
      });
    }

    console.log("Données insérées avec succès !");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
