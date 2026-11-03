import { Request, Response } from "express";
import {
  LOYALTY_POINTS_PER_DOLLAR,
  LOYALTY_REDEMPTION_STEP_POINTS,
  LOYALTY_REDEMPTION_STEP_VALUE,
  LOYALTY_MAX_POINTS,
  LOYALTY_ADMIN_ADJUSTMENT_STEP_POINTS,
} from "../config/loyalty.config";
import { STALLED_ORDER_TIMEOUT_MS } from "../config/order.config";
import { getLocaux } from "../services/locaux.service";

export const getLoyaltyConfig = (_req: Request, res: Response) => {
  return res.status(200).json({
    loyaltyPointsPerDollar: LOYALTY_POINTS_PER_DOLLAR,
    loyaltyRedemptionStepPoints: LOYALTY_REDEMPTION_STEP_POINTS,
    loyaltyRedemptionStepValue: LOYALTY_REDEMPTION_STEP_VALUE,
    loyaltyMaxPoints: LOYALTY_MAX_POINTS,
    loyaltyAdminAdjustmentStepPoints: LOYALTY_ADMIN_ADJUSTMENT_STEP_POINTS,
    stalledOrderTimeoutMs: STALLED_ORDER_TIMEOUT_MS,
  });
};

export const getLocauxConfig = (_req: Request, res: Response) => {
  return res.status(200).json({ locaux: getLocaux() });
};
