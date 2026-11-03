import { describe, expect, it, jest } from "@jest/globals";
import type { Response } from "express";
import { getLocauxConfig } from "../../controllers/config.controller";

const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn(() => res as Response) as any;
  res.json = jest.fn(() => res as Response) as any;
  return res as Response;
};

describe("ConfigControllerTests", () => {
  it("getLocauxConfig_ReturnsLocauxList", () => {
    const res = makeRes();

    getLocauxConfig({} as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        locaux: expect.arrayContaining(["C-025"]),
      }),
    );
  });
});
