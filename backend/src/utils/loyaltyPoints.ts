import { LOYALTY_ADMIN_ADJUSTMENT_STEP_POINTS } from "../config/loyalty.config";

export const roundAdminLoyaltyPointsDelta = (pointsDelta: number) => {
  if (!Number.isFinite(pointsDelta)) return 0;

  const rounded =
    Math.sign(pointsDelta) *
    Math.round(Math.abs(pointsDelta) / LOYALTY_ADMIN_ADJUSTMENT_STEP_POINTS) *
    LOYALTY_ADMIN_ADJUSTMENT_STEP_POINTS;

  return Object.is(rounded, -0) ? 0 : rounded;
};
