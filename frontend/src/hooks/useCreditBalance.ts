import { useEffect, useState } from "react";
import { userService } from "../services/userService";

export function useCreditBalance(isLoggedIn: boolean) {
  const [creditState, setCreditState] = useState({
    isLoggedIn: false,
    balance: 0,
  });

  useEffect(() => {
    if (!isLoggedIn) {
      setCreditState({
        isLoggedIn: false,
        balance: 0,
      });
      return;
    }

    let isMounted = true;
    const loadCreditBalance = () => {
      userService
        .getCreditBalance()
        .then(({ creditBalance }) => {
          if (isMounted) {
            setCreditState({
              isLoggedIn: true,
              balance: Math.max(Number(creditBalance ?? 0), 0),
            });
          }
        })
        .catch((err) => {
          console.error("Erreur lors du fetch du crédit client:", err);
          if (isMounted) {
            setCreditState({
              isLoggedIn: true,
              balance: 0,
            });
          }
        });
    };

    loadCreditBalance();
    window.addEventListener("credit:refresh", loadCreditBalance);
    window.addEventListener("focus", loadCreditBalance);
    const unsubscribeCreditStream = userService.subscribeToCreditBalance(
      (balance) => {
        if (isMounted) {
          setCreditState({
            isLoggedIn: true,
            balance,
          });
        }
      },
    );

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCreditBalance();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("credit:refresh", loadCreditBalance);
      window.removeEventListener("focus", loadCreditBalance);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribeCreditStream?.();
    };
  }, [isLoggedIn]);

  return creditState.isLoggedIn === isLoggedIn ? creditState.balance : 0;
}
