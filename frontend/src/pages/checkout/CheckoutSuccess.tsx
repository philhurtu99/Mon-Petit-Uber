import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./checkout.css";
import { API_URL } from "../../config";
import { useCart } from "../../contexts/cartContext";
import mascotte from "../../assets/Mascotte-PouceEnHaut.png";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";

const IS_DEV = import.meta.env.DEV;

type Status = "loading" | "paid" | "error";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const { refreshCart } = useCart();

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");
      if (!sessionId) {
        if (!cancelled) setStatus("error");
        return;
      }

      // En dev : pas de webhook, on appelle /confirm pour finaliser la commande
      if (IS_DEV) {
        try {
          await fetch(`${API_URL}/api/checkout/confirm?session_id=${sessionId}`, {
            credentials: "include",
          });
        } catch (err) {
          console.error("Erreur confirmation dev:", err);
        }
      }

      try {
        const res = await fetch(
          `${API_URL}/api/checkout/status?session_id=${sessionId}`,
          { credentials: "include" },
        );
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data.paid) {
          setStatus("paid");
          void refreshCart();
          window.dispatchEvent(new CustomEvent("commande:refresh"));
          window.dispatchEvent(new Event("credit:refresh"));
          window.dispatchEvent(new Event("loyalty:refresh"));
        } else {
          setStatus("error");
        }
      } catch (err) {
        console.error("Erreur vérification paiement:", err);
        if (!cancelled) setStatus("error");
      }
    };

    void verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [refreshCart, searchParams]);

  if (status === "loading") {
    return (
      <div className="checkout__wrapper">
        <div className="checkout__content">
          <h1 className="checkout__title">Vérification du paiement...</h1>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="checkout__wrapper">
        <div className="checkout__content">
          <h1 className="checkout__title">Erreur de vérification</h1>
          <p className="checkout__subtitle">
            Nous n'avons pas pu confirmer votre paiement. Contactez-nous si vous avez été facturé.
          </p>
          <div className="checkout__buttons">
            <button
              className="checkout__btn"
              onClick={() => navigate("/transactions")}
            >
              Voir mes transactions
            </button>
            <button
              className="checkout__btn-secondary"
              onClick={() => navigate("/products")}
            >
              Continuer mes achats
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout__wrapper">
      <div className="checkout__content">
        <img src={mascotte} alt="Paiement réussi" className="checkout__image" />
        <h1 className="checkout__title">Paiement réussi !</h1>
        <p className="checkout__subtitle">
          Merci pour votre commande. Vous pouvez consulter votre historique de transactions.
        </p>
        <div className="checkout__buttons">
          <button
            className="checkout__btn"
            onClick={() => navigate("/transactions")}
          >
            Voir mes transactions
          </button>
          <button
            className="checkout__btn-secondary"
            onClick={() => navigate("/products")}
          >
            Continuer mes achats
          </button>
        </div>
      </div>
    </div>
  );
}
