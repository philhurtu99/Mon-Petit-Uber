import { useNavigate } from "react-router-dom";
import styles from "./notFound.module.css";
import mascotte from "../../assets/mascotte-error-404.png";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <img
          src={mascotte}
          alt="Erreur 404 - Page introuvable"
          className={styles.image}
        />
        <p className={styles.subtitle}>
          La page que tu cherches n'existe pas ou a été déplacée.
        </p>
        <button className={styles.btn} onClick={() => navigate("/")}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
