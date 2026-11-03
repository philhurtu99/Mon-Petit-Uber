import { EventEmitter } from "events";

export const creditEvents = new EventEmitter();

creditEvents.setMaxListeners(100);

export const USER_CREDIT_CHANGED = "user-credit-changed";

export function notifyUserCreditChanged(userId: string) {
  creditEvents.emit(USER_CREDIT_CHANGED, userId);
}
