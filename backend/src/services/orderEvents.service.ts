import { EventEmitter } from "events";

export const orderEvents = new EventEmitter();

orderEvents.setMaxListeners(100);

export const ORDER_PREPARATION_CHANGED = "order-preparation-changed";
export const ORDER_DELIVERY_CHANGED = "order-delivery-changed";
export const USER_ORDER_EXPIRED = "user-order-expired";

export type UserOrderExpiredPayload = {
  userId: string;
  orderId: number;
};

export function notifyOrderPreparationChanged() {
  orderEvents.emit(ORDER_PREPARATION_CHANGED);
}

export function notifyOrderDeliveryChanged() {
  orderEvents.emit(ORDER_DELIVERY_CHANGED);
}

export function notifyUserOrderExpired(payload: UserOrderExpiredPayload) {
  orderEvents.emit(USER_ORDER_EXPIRED, payload);
}
