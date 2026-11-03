
import "./helpPage.css";
import styles from "./modalHelp/modalHelp.module.css";
import { useHelp } from '../../contexts/helpContext';
import { TransactionPage } from "./pages/transactionPage";
import { ProductPage } from "./pages/productPage";
import { PromotionsPage } from "./pages/promotionsPage";
import { InventoryPage } from "./pages/inventoryPage";
import { ProfilPage } from "./pages/profilPage";
import { CartPage } from "./pages/cartPage";
import { DeliveryPage } from "./pages/deliveryPage";
import { OrderTrackingPage } from "./pages/orderTrackingPage";
import { PreparationPage } from "./pages/preparationPage";
import { FaqAdminPage } from "./pages/faqAdminPage";
import { useResizablePanel } from "./hooks/useResizePanel";
import { OrdersHistoryPage } from "./pages/ordersHistoryPage";
import { ClientsDashboardPage } from "./pages/clientsDashboardPage";
import { FaqPage } from "./pages/faqPage";
import { LivreurDashboardPage } from "./pages/livreurDashboardPage";
import { SalesDashboardPage } from "./pages/salesDashboardPage";
import { RestrictedWordsPage } from "./pages/restrictedWordsPage";
import { useState } from "react";

const HELP_ALLOWED_PATHS = [
  "/transactions",
  "/products",
  "/admin/promotions",
  "/admin/inventory",
  "/profil",
  "/cart",
  "/livraison",
  "/suivi-commandes",
  "/preparateur/preparation",
  "/preparateur",
  "/admin/faq",
  "/admin/commandes",
  "/admin/clients",
  "/faq",
  "/livreur/dashboard",
  "/admin/ventes",
  "/admin/restricted-words"
];

export function isHelpAllowed(pathname : string) {
  return HELP_ALLOWED_PATHS.includes(pathname);
}

type Props = {
  onClose: () => void;
  width: number;
  onWidthChange: (w: number) => void;
};

// Composant de la page d'aide qui affiche des informations en fonction de l'aide sélectionnée
export function HelpPage( {onClose, width, onWidthChange} : Props) {
  const { help } = useHelp();
  const { startResize } = useResizablePanel({
    initialWidth: width,
    minWidth: 400,
    maxWidth: 600,
    onResize: onWidthChange,
  });

  const pathname = window.location.pathname;

  if (!isHelpAllowed(pathname)) return null; 

  return (
    <div className="help-page" style={{ width }}>
      <div className={styles["help-header"]}>
        <h3>Aide</h3>
        <button type="button" className={styles["help-close-btn"]} onClick={onClose}>✖</button>
      </div>

      <div
        className="resize-handle"
        onMouseDown={startResize}
      />

      <div className="helpPage help-container">
        { pathname === "/transactions" && <TransactionPage help={help} /> }
        { pathname === "/products" && <ProductPage help={help} /> }
        { pathname === "/admin/promotions" && <PromotionsPage help={help} /> }
        { pathname === "/admin/inventory" && <InventoryPage help={help} /> }
        { pathname === "/profil" && <ProfilPage help={help} /> }
        { pathname === "/cart" && <CartPage help={help} /> }
        { pathname === "/livraison" && <DeliveryPage help={help} /> }
        { pathname === "/suivi-commandes" && <OrderTrackingPage help={help} /> }
        { pathname === "/preparateur/preparation" && <PreparationPage help={help} /> }
        { pathname === "/preparateur" && <PreparationPage help={help} /> }
        { pathname === "/admin/faq" && <FaqAdminPage help={help} /> }
        { pathname === "/admin/commandes" && <OrdersHistoryPage help={help} /> }
        { pathname === "/admin/clients" && <ClientsDashboardPage help={help} /> }
        { pathname === "/faq" && <FaqPage help={help} /> }
        { pathname === "/livreur/dashboard" && <LivreurDashboardPage help={help} /> }
        { pathname === "/admin/ventes" && <SalesDashboardPage help={help} /> }
        { pathname === "/admin/restricted-words" && <RestrictedWordsPage help={help} /> }

        {!help && <p>Sélectionne un élément</p>}
      </div>
    </div>
    
  );
}
