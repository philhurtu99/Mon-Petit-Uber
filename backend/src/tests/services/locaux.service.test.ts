import { describe, expect, it } from "@jest/globals";
import {
  getLocaux,
  isValidLocal,
  normalizeLocal,
} from "../../services/locaux.service";

describe("LocauxServiceTests", () => {
  it("normalizeLocal_TrimsAndUppercasesValue", () => {
    expect(normalizeLocal(" c-025 ")).toBe("C-025");
  });

  it("getLocaux_ReturnsConfiguredLocaux", () => {
    const locaux = getLocaux();

    expect(locaux.length).toBeGreaterThan(0);
    expect(locaux).toContain("C-025");
  });

  it("isValidLocal_ValidatesAgainstLocauxJson", () => {
    expect(isValidLocal("c-025")).toBe(true);
    expect(isValidLocal("Z-999")).toBe(false);
  });
});
