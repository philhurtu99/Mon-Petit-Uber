import { prismaMock } from "../prismaMock";
import { updateUser } from "../../services/user.service";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";

const mockUser = {
    id: "cmo3hwmy6000ep0nvjx3farrs",
    firstName: "Juan",
    lastName: "Santofimio",
    email: "juan@example.com",
    emailVerifiedAt: new Date(),
    password: null,
    googleId: null,
    address: "309 ch chambly",
    phone: "5148674413",
    profilePicture: "/uploads/profiles/avatar.jpg",
    role: "user",
    creditBalance: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("ProductServiceTests", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Vérifie que la mise à jour du profil retourne les données mises à jour
    it("updateUser_returns200", async () => {

        // Arrange  
        const input = { id: mockUser.id, firstName: "js", lastName: "Santo", address: "94 ch chambly", phone: "5148889632", };
        const updatedData = { ...mockUser, ...input };

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        prismaMock.user.update.mockResolvedValue(updatedData);

        // Act
        const result = await updateUser(input);

        // Assert
        expect(result.firstName).toBe("js");
        expect(result.lastName).toBe("Santo");
        expect(result.address).toBe("94 ch chambly");
        expect(result.phone).toBe("5148889632");
    });


    // Vérifie que la mise à jour retourne une erreur si le prénom est trop court
    it("updateUser_firstName_returns400", async () => {

        // Arrange  
        const input = { id: mockUser.id, firstName: "j", };

        // Act
        const act = updateUser(input)

        //Assert
        await expect(act).rejects.toThrow("Le prénom doit contenir au moins 2 caractères");
    });

    // Vérifie que la mise à jour retourne une erreur si le nom est trop court
    it("updateUser_lastName_returns400", async () => {

        // Arrange  
        const input = { id: mockUser.id, lastName: "S", };

        // Act
        const act = updateUser(input)

        //Assert
        await expect(act).rejects.toThrow("Le nom doit contenir au moins 2 caractères");
    });
    
    // Vérifie que la mise à jour retourne une erreur si le téléphone est invalide
    it("updateUser_phone_returns400", async () => {

        // Arrange  
        const input = { id: mockUser.id, phone: "514873639", };

        // Act
        const act = updateUser(input)

        //Assert
        await expect(act).rejects.toThrow("Téléphone invalide");
    });

    // Vérifie que l'ancien avatar est supprimé lors du changement de photo de profil
    it("updateUser_existingAvatar", async () => {

        // Arrange  
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        jest.spyOn(fs, "unlinkSync").mockImplementation(() => { });

        const input = { id: mockUser.id, profilePicture: "/uploads/profiles/newAvatar.jpg", };
        const updatedData = { ...mockUser, ...input };

        prismaMock.user.findUnique.mockResolvedValue(mockUser);
        prismaMock.user.update.mockResolvedValue(updatedData);

        // Act
        const result = await updateUser(input)

        //Assert        
        expect(fs.unlinkSync).toHaveBeenCalled();
        expect(result.profilePicture).toBe("/uploads/profiles/newAvatar.jpg");
    });

    // Vérifie qu'aucune suppression n'est effectuée si l'utilisateur n'a pas de photo de profil
    it("updateUser_noExistingAvatar", async () => {

        // Arrange  
        jest.spyOn(fs, "existsSync").mockReturnValue(false);
        jest.spyOn(fs, "unlinkSync").mockImplementation(() => { });

        const mockUserNoAvatar = { ...mockUser, profilePicture: null };
        const input = { id: mockUser.id, profilePicture: "/uploads/profiles/newAvatar.jpg" };
        const updatedData = { ...mockUserNoAvatar, ...input };

        prismaMock.user.findUnique.mockResolvedValue(mockUserNoAvatar);
        prismaMock.user.update.mockResolvedValue(updatedData);

        // Act
        const result = await updateUser(input);

        // Assert
        expect(fs.unlinkSync).not.toHaveBeenCalled();
        expect(result.profilePicture).toBe("/uploads/profiles/newAvatar.jpg");
    });
});
