import { EventEmitter } from "events";

export const loyaltyEvents = new EventEmitter();

loyaltyEvents.setMaxListeners(100);

export const USER_LOYALTY_POINTS_CHANGED = "user-loyalty-points-changed";

export function notifyUserLoyaltyPointsChanged(userId: string) {
  loyaltyEvents.emit(USER_LOYALTY_POINTS_CHANGED, userId);
}
