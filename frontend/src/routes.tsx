import type { RouteObject } from "react-router-dom";

import InventoryManagement from "./pages/Inventory_admin/admin-inventory";
import Accueil from "./pages/accueil/accueil";
import InventoryClient from "./pages/Inventory_client/inventory_client";
import Promotions from "./pages/Promotions_admin";
import AdminGuard from "./guards/AdminGuard";
import AuthGuard from "./guards/authGuard";
import { ProfilePage } from "./pages/profile-page";
import Cart from "./pages/cart/cart";
import NotFound from "./pages/notFound/notFound";
import { TransactionHistory } from "./pages/transaction-history";
import CheckoutSuccess from "./pages/checkout/CheckoutSuccess";
import CheckoutCancel from "./pages/checkout/CheckoutCancel";
import PreparationOrders from "./pages/preparation-orders";
import OrderTracking from "./pages/order-tracking";
import PreparateurGuard from "./guards/PreparateurGuard";
import LivraisonPage from "./pages/livraison";
import Faq from "./pages/faq/Faq";
import AdminFaq from "./pages/Faq_Admin/AdminFaq";
import AdminClient from "./pages/AdminClient/AdminClient";
import { SalesDashboard } from "./pages/SalesDashboard";
import { OrdersHistory } from "./pages/orders-history";
import LivreurDashboard from "./pages/livreurDashboard/livreurDashboard";
import RestrictedWordsAdmin from "./pages/RestrictedWordsAdmin";

// NOTE:
// HomePage est défini dans App.tsx pour l’instant.
// Si tu veux aussi le sortir, on pourra créer `pages/HomePage.tsx`.

export function createAppRoutes(): RouteObject[] {
  return [
    {
      path: "/admin/promotions",
      element: (
        <AdminGuard>
          {" "}
          <Promotions />{" "}
        </AdminGuard>
      ),
    },
    {
      path: "/admin/commandes",
      element: (
        <AdminGuard>
          {" "}
          <OrdersHistory />{" "}
        </AdminGuard>
      ),
    },
    { path: "/", element: <Accueil /> },
    {
      path: "/admin/inventory",
      element: (
        <AdminGuard>
          <InventoryManagement />
        </AdminGuard>
      ),
    },
    { path: "/products", element: <InventoryClient /> },
    { path: "/products/:id", element: <InventoryClient /> },
    { path: "/accueil", element: <Accueil /> },
    {
      path: "/profil",
      element: (
        <AuthGuard>
          <ProfilePage />
        </AuthGuard>
      ),
    },
    { path: "/cart", element: <Cart /> },
    { path: "*", element: <NotFound /> },
    {
      path: "/transactions",
      element: (
        <AuthGuard>
          <TransactionHistory />
        </AuthGuard>
      ),
    },
    {
      path: "/preparateur",
      element: (
        <PreparateurGuard>
          <PreparationOrders />
        </PreparateurGuard>
      ),
    },
    {
      path: "/preparateur/preparation",
      element: (
        <PreparateurGuard>
          <PreparationOrders />
        </PreparateurGuard>
      ),
    },
    {
      path: "/suivi-commandes",
      element: (
        <PreparateurGuard>
          <OrderTracking />
        </PreparateurGuard>
      ),
    },
    {
      path: "/livraison",
      element: (
        <PreparateurGuard>
          <LivraisonPage />
        </PreparateurGuard>
      ),
    },
    { path: "/checkout/success", element: <CheckoutSuccess /> },
    { path: "/checkout/cancel", element: <CheckoutCancel /> },
    { path: "/faq", element: <Faq /> },
    {
      path: "/admin/faq",
      element: (
        <AdminGuard>
          <AdminFaq />
        </AdminGuard>
      ),
    },
    {
      path: "/admin/restricted-words",
      element: (
        <AdminGuard>
          <RestrictedWordsAdmin />
        </AdminGuard>
      ),
    },
    {
      path: "/admin/clients",
      element: (
        <AdminGuard>
          <AdminClient />
        </AdminGuard>
      ),
    },
    {
      path: "/admin/ventes",
      element: (
        <AdminGuard>
          <SalesDashboard />
        </AdminGuard>),
    },
    {
      path: "/livreur/dashboard",
      element: (
        <PreparateurGuard>
          <LivreurDashboard />
        </PreparateurGuard>
      ),
    },
  ];
}
