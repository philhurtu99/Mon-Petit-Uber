import {
  ORDER_PREPARATION_CHANGED,
  notifyOrderPreparationChanged,
  orderEvents,
} from "../../services/orderEvents.service";

describe("OrderEventsServiceTests", () => {
  afterEach(() => {
    orderEvents.removeAllListeners(ORDER_PREPARATION_CHANGED);
  });

  it("NotifyOrderPreparationChanged_EmitsPreparationChangedEvent", () => {
    const listener = jest.fn();
    orderEvents.on(ORDER_PREPARATION_CHANGED, listener);

    notifyOrderPreparationChanged();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("OrderEvents_AllowsManySubscribers", () => {
    const listeners = Array.from({ length: 25 }, () => jest.fn());

    for (const listener of listeners) {
      orderEvents.on(ORDER_PREPARATION_CHANGED, listener);
    }

    notifyOrderPreparationChanged();

    for (const listener of listeners) {
      expect(listener).toHaveBeenCalledTimes(1);
    }
  });
});
