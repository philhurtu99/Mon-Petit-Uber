import { prismaMock } from "../prismaMock";
import {
    getAllFaq,
    getFaqById,
    createFaq,
    updateFaq,
    deleteFaq,
} from "../../services/faq.service";



describe("FaqServiceTests", () => {
    
    //---------------------------------------------------------------
    // Teste getAllFaq - retourne toutes les FQS triées
    it("getAllFaq_RetourneToutesLesFaq", async () => {

        // Arrange
        const mockFaqs = [
            {
                id: "1",
                question: "Q1",
                answer: "A1",
                keywords: ["k1"],
                category: "LIVRAISON",
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "2",
                question: "Q2",
                answer: "A1",
                keywords: ["k2"],
                category: "PAIEMENT",
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        ] as any;

        prismaMock.faqItem.findMany.mockResolvedValue(mockFaqs);

        // Act
        const result = await getAllFaq();

        // Assert
        expect(result).toHaveLength(2);
        expect(prismaMock.faqItem.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: [{ category: "asc" }, { createdAt: "asc" }],
            })
        );
    });

    //---------------------------------------------------------------
    // Teste getFaqById - retourne null si FAQ n'existe pas
    it("getFaqById_WhenIdInexistant_RetourneNull", async () => {

        // Arrange
        prismaMock.faqItem.findUnique.mockResolvedValue(null);

        // Act
        const result = await getFaqById("inexistant");

        // Assert
        expect(result).toBeNull();
    });

    //---------------------------------------------------------------
    // Teste createFaq - appelle prisma.faqItem.create avec bons paramètre
    it("createFaq_AppelleCreateAvecLesBonsParams", async () => {

        // Arrange
        const newFaqInput = {
            question: "Comment commander ?",
            answer  : "Ajoutez au panier...",
            keywords: ["commande", "panier"],
            category: "MENU" as const,
        };

        const mockCreated = {id: "new-id", ...newFaqInput, createdAt: new Date(), updatedAt: new Date() } as any;
        prismaMock.faqItem.create.mockResolvedValue(mockCreated);

        // Act 
        const result = await createFaq(newFaqInput);

        // Assert
        expect(result.id).toBe("new-id");
        expect(prismaMock.faqItem.create).toHaveBeenCalledWith({ data: newFaqInput })

    });

    //---------------------------------------------------------------
    // Teste updateFaq - appelle prisma.faqItem.create avec les bons paramètre
    it("updateFaq_AppelleUpdateAvecLesBonsParams", async () => {

        // Arrange
        const updateInput = {
            question: "Q modifié",
            answer: "A modifié",
            keywords: ["nouveau"],
            category: "AUTRE" as const,
        };

        const mockUpdated = {
            id: "1",
            ...updateInput,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any;

        prismaMock.faqItem.update.mockResolvedValue(mockUpdated);

        // Act
        const result = await updateFaq("1", updateInput);

        // Assert
        expect(result.id).toBe("1");

        expect(prismaMock.faqItem.update).toHaveBeenCalledWith({
            where: { id: "1" },
            data: updateInput,
        });
    });

    //---------------------------------------------------------------
    // Teste deleteFaq - appelle prisma.delete avec le bon ID
    it("deleteFaq_AppelleDeleteAvecLeBonId", async () => {

        // Arrange
        const mockDeleted = {
            id: "l",
            question: "Q",
            answer: "A",
            keywords: [],
            category: "AUTRE",
            createdAt: new Date(),
            updatedAt: new Date(),
        } as any;
        prismaMock.faqItem.delete.mockResolvedValue(mockDeleted);

        // Act
        const result = await deleteFaq("l");

        // Assert
        expect(result.id).toBe("l");
        expect(prismaMock.faqItem.delete).toHaveBeenCalledWith({ where: { id: "l" } });
    });
});