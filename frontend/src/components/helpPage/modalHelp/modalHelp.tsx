import { useHelp } from "../../../contexts/helpContext";
import { AddCategoryPage } from "../pages/addCategoryPage";
import { AddProductPage } from "../pages/addProductPage";
import { EditPromotionPage } from "../pages/ediPromotionyPage";
import { EditCategoryPage } from "../pages/editCategoryPage";
import { EditProductPage } from "../pages/editProductPage";
import { ForgotPasswordPage } from "../pages/forgotPasswordPage";
import { LoginPage } from "../pages/loginPage";
import { RegisterPage } from "../pages/registerPage";
import { ResetPasswordPage } from "../pages/resetPasswordPage";
import styles from "./modalHelp.module.css";
import { useResizablePanel } from "../hooks/useResizePanel";
import { AddFaqPage } from "../pages/addFaqPage";
import { EditFaqPage } from "../pages/editFaqPage";
import { ClientDashboardPage } from "../pages/clientDashboardPage";
import { createPortal } from "react-dom";
import { ProductDetailsdPage } from "../pages/productDetailsdPage";

type Props = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  page: string;
  variant?: "dark" | "light"; // changer la couleur du text si nécessaire
};


/**
 * Lien vers une page overlay d'aide
 * @param isOpen true si la fenetre doit etre ouverte, false dans les autres cas
 * @param onOpen handle onOpen 
 * @param onClose handle onClose 
 * @param page : page du la page d'aide 
 * @param variant : couleur du text si nécessaire
 * @returns 
 */
export default function HelpModal({ isOpen, onOpen, onClose, page, variant = "dark" }: Props) {
  const { help } = useHelp();
  const { width, startResize } = useResizablePanel({
    initialWidth: 400,
    minWidth: 400,
    maxWidth: 800,
  });

  return (
    <div>
      {/* Bouton help */}
      <button 
        type="button"
        className={`${styles["modalHelp"]} ${variant === "light" ? styles["modalHelp--light"] : ""}`}
        onClick={onOpen}>
        Besoin d’aide ?
      </button>

        {isOpen &&
          createPortal(
            <div
              className={styles["help-panel"]}
              style={{ width }}
            >
              <div className={styles["help-header"]}>
                <h3>Aide</h3>

                <button
                  type="button"
                  className={styles["help-close-btn"]}
                  onClick={onClose}
                >
                  ✖
                </button>
              </div>

              <div
                className="resize-handle"
                onMouseDown={startResize}
              />

              <div className="help-container helpPage">
                {page === "login" && <LoginPage help={help} />}
                {page === "register" && <RegisterPage help={help} />}
                {page === "resetPassword" && <ResetPasswordPage help={help} />}
                {page === "forgotPassword" && <ForgotPasswordPage help={help} />}
                {page === "addCategory" && <AddCategoryPage help={help} />}
                {page === "addProduct" && <AddProductPage help={help} />}
                {page === "editCategory" && <EditCategoryPage help={help} />}
                {page === "editProduct" && <EditProductPage help={help} />}
                {page === "editPromotion" && <EditPromotionPage help={help} />}
                {page === "addFaq" && <AddFaqPage help={help} />}
                {page === "editFaq" && <EditFaqPage help={help} />}
                {page === "clientDashboard" && <ClientDashboardPage help={help} />}
                {page === "details" && <ProductDetailsdPage help={help} />}

                {!help && <p>Sélectionne un élément</p>}
              </div>
            </div>,
            document.body
          )}
    </div>
  );
}