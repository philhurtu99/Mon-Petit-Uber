import { useNavigate } from "react-router-dom";
import "./checkout.css";
import mascotte from "../../assets/mascotte_questionnement.png";

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="checkout__wrapper">
      <div className="checkout__content">
        <img src={mascotte} alt="Paiement annulé" className="checkout__image" />
        <h1 className="checkout__title">Paiement annulé</h1>
        <p className="checkout__subtitle">
          Votre panier a été conservé. Vous pouvez réessayer quand vous voulez.
        </p>
        <div className="checkout__buttons">
          <button className="checkout__btn" onClick={() => navigate("/cart")}>
            Retourner au panier
          </button>
          <button className="checkout__btn-secondary" onClick={() => navigate("/products")}>
            Continuer mes achats
          </button>
        </div>
      </div>
    </div>
  );
}
