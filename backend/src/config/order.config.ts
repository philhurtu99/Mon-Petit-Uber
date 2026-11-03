export const ORDER_EXPIRATION_MINUTES = 30;
export const ORDER_EXPIRATION_MS = ORDER_EXPIRATION_MINUTES * 60 * 1000;

export const STALLED_ORDER_TIMEOUT_MINUTES = 15;
export const STALLED_ORDER_TIMEOUT_MS = process.env
  .STALLED_ORDER_TIMEOUT_SECONDS
  ? Number(process.env.STALLED_ORDER_TIMEOUT_SECONDS) * 1000
  : STALLED_ORDER_TIMEOUT_MINUTES * 60 * 1000;

export function getOrderExpirationMs() {
  const seconds = Number(process.env.ORDER_EXPIRATION_SECONDS);

  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  return ORDER_EXPIRATION_MS;
}
// commande de test 10 secondes avant l'expiration
// A lancer dans le backend
// npm run dev:expiration-test
