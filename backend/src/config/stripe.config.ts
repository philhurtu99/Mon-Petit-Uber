import { getRequiredEnv } from "../utils/env";
import Stripe from "stripe";

const STRIPE_SECRET_KEY =
  getRequiredEnv("STRIPE_SECRET_KEY");
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = new Stripe(STRIPE_SECRET_KEY);

export default stripe;
