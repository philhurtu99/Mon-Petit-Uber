import { getRequiredEnv } from "../../utils/env";

describe("getRequiredEnv", () => {
  const name = "REQUIRED_ENV_UNIT_TEST";
  const original = process.env[name];

  afterEach(() => {
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  });

  it.each([undefined, "", "   "])("rejects missing or blank configuration (%p)", (value) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
    expect(() => getRequiredEnv(name)).toThrow(`Missing required environment variable: ${name}`);
  });

  it("uses the configured value without altering it", () => {
    process.env[name] = " configured value ";
    expect(getRequiredEnv(name)).toBe(" configured value ");
  });
});
