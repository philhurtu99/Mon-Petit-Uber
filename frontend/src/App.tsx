import { Link, useRoutes, NavLink, useLocation } from "react-router-dom";
import { createAppRoutes } from "./routes";
import "./App.css";
import { useCart } from "./contexts/cartContext";
import { CartIcon } from "./components/icons/CartIcon";
import { CommandeIcon } from "./components/icons/CommandeIcon";
import { useAuth } from "./contexts/authContext";
import AuthManager from "./components/Auth/AuthManager";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Menu, X, ChevronDown, HelpCircle } from "lucide-react";
import { authService } from "./services/authService";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "./assets/default-avatar.png";
import { API_URL } from "./config";
import { CartPopup } from "./components/cart/CartPopup";
import CommandeModal from "./components/orderModal/orderModal";
import EmployeeReviewModal from "./components/employeeReviewFormModal/employeeReviewFormModal";
import type { Commande } from "./models";
import {
  preparateurService,
  type PreparationOrder,
  type PreparationOrderType,
} from "./services/preparateurService";
import { ordersService } from "./services/ordersService";
import FaqBot from "./components/faqBot/faqBot";
import { HelpPage, isHelpAllowed } from "./components/helpPage";
import { useHelp } from "./contexts/helpContext";
import { useCreditBalance } from "./hooks/useCreditBalance";
import { configService } from "./services/configService";

type PreparationNotification = {
  orderId: number;
  type: PreparationOrderType;
  message: string;
  variant?: "new" | "overdue" | "error";
  customerName?: string;
  total?: number;
  itemsCount?: number;
};

function getPreparationCustomerName(order: PreparationOrder) {
  const user = order.transaction.user;
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return fullName || user?.email || "Client";
}

function getPreparationItemsCount(order: PreparationOrder) {
  return order.transaction.items.reduce((sum, item) => sum + item.quantity, 0);
}

function formatPreparationTotal(value?: number) {
  if (typeof value !== "number") return null;
  return `${value.toFixed(2)} $`;
}

function getPreparationNotificationMessage(order: PreparationOrder) {
  return order.type === "LIVRAISON"
    ? `Nouvelle Livraison #${order.id}`
    : `Nouveau Ramassage #${order.id}`;
}

function getPreparationOverdueMessage(order: PreparationOrder) {
  return `${order.type === "LIVRAISON" ? "Livraison" : "Ramassage"
    } #${order.id} à préparer depuis plus de 15 min`;
}

function isPreparationOrderOverdue(order: PreparationOrder) {
  return Date.now() - new Date(order.createdAt).getTime() >= 15 * 60 * 1000;
}

const NavDropdown = ({
  label,
  children,
  isActive,
}: {
  label: string;
  children: React.ReactNode;
  isActive?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="nav-dropdown-wrapper" ref={dropdownRef}>
      <button
        className={`nav-link nav-dropdown-btn ${isActive || isOpen ? "active" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        type="button"
      >
        {label}{" "}
        <ChevronDown
          size={16}
          className={`nav-chevron ${isOpen ? "open" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="nav-dropdown-menu" onClick={() => setIsOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
};

function App() {
  const location = useLocation();

  const routing = useRoutes(createAppRoutes());
  const { count } = useCart();
  const { isLoggedIn, logout, user, updateUser } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartBtnDesktopRef = useRef<HTMLButtonElement>(null);
  const cartPopupRef = useRef<HTMLDivElement>(null);
  const creditBalance = useCreditBalance(isLoggedIn);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [preparationNotification, setPreparationNotification] =
    useState<PreparationNotification | null>(null);
  const hasVerified = useRef(false);
  const knownPreparationOrderIds = useRef<Set<number>>(new Set());
  const currentPreparationOrders = useRef<PreparationOrder[]>([]);
  const overdueNotifiedOrderIds = useRef<Set<number>>(new Set());
  const hasLoadedPreparationOrders = useRef(false);
  const preparationNotificationTimeout = useRef<number | null>(null);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandeOpen, setIsCommandeOpen] = useState(false);
  const [activeCommande, setActiveCommande] = useState<Commande | null>(null);
  const commandeBtnDesktopRef = useRef<HTMLButtonElement>(null);
  const commandePopupRef = useRef<HTMLDivElement>(null);
  const [isPreparationModeEnabled, setIsPreparationModeEnabled] = useState(
    () => localStorage.getItem("preparationModeEnabled") !== "false",
  );
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [commandeToReview, setCommandeToReview] = useState<Commande | null>(
    null,
  );
  const reviewedCommandeIds = useRef<Set<number>>(new Set());
  const prevCommandeRef = useRef<Commande | null>(null);
  const [isStalled, setIsStalled] = useState(false);
  const hasNotifiedStalled = useRef(false);
  const [stalledTimeoutMs, setStalledTimeoutMs] = useState(15 * 60 * 1000);

  const [isHelpOpen, setIsHelpOpen] = useState(false); // ← 1. Ajoute cet état

  const { clearHelp } = useHelp();
  const [helpWidth, setHelpWidth] = useState(400);

  useEffect(() => {
    configService
      .getLoyaltyConfig()
      .then((config) => setStalledTimeoutMs(config.stalledOrderTimeoutMs))
      .catch((err) =>
        console.error("Erreur chargement config stalled timeout:", err),
      );
  }, []);

  useEffect(() => {
    if (
      !activeCommande ||
      activeCommande.etat !== "READY_FOR_DELIVERY" ||
      !activeCommande.readyForPickupAt
    ) {
      setIsStalled(false);
      hasNotifiedStalled.current = false;
      return;
    }

    const checkStalled = () => {
      const readyAt = new Date(activeCommande.readyForPickupAt!).getTime();
      const stalled = Date.now() - readyAt > stalledTimeoutMs;
      setIsStalled(stalled);

      if (stalled && !hasNotifiedStalled.current) {
        setNotification({
          type: "error",
          text: "Aucun livreur disponible. Vérifiez votre commande pour les options.",
        });
        window.setTimeout(() => setNotification(null), 3000);
        hasNotifiedStalled.current = true;
      }
    };

    checkStalled();
    const interval = setInterval(checkStalled, 1000);
    return () => clearInterval(interval);
  }, [activeCommande, stalledTimeoutMs]);

  const showPreparationNotification = useCallback(
    (notification: PreparationNotification) => {
      setPreparationNotification(notification);

      if (preparationNotificationTimeout.current) {
        window.clearTimeout(preparationNotificationTimeout.current);
      }

      preparationNotificationTimeout.current = window.setTimeout(() => {
        setPreparationNotification(null);
        preparationNotificationTimeout.current = null;
      }, 8000);
    },
    [],
  );

  const handleCommandeUpdate = useCallback((commande: Commande | null) => {
    if ((commande == null) && prevCommandeRef.current?.etat === "IN_DELIVERY" && prevCommandeRef.current?.livreurId &&
      !reviewedCommandeIds.current.has(prevCommandeRef.current.id)) 
      {
      const completedCommande = prevCommandeRef.current;
      reviewedCommandeIds.current.add(completedCommande.id);
      setCommandeToReview(completedCommande);
      setIsReviewOpen(true);
      setIsCommandeOpen(false);
    }

    prevCommandeRef.current = commande;
    setActiveCommande(commande);
  }, []);

  useEffect(() => {
    const handleManualPreparationNotification = (event: Event) => {
      const detail = (event as CustomEvent<PreparationNotification>).detail;
      if (!detail) return;
      showPreparationNotification(detail);
    };

    window.addEventListener(
      "preparation:new-order-notification",
      handleManualPreparationNotification,
    );

    return () =>
      window.removeEventListener(
        "preparation:new-order-notification",
        handleManualPreparationNotification,
      );
  }, [showPreparationNotification]);

  useEffect(() => {
    const handlePreparationModeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
      if (!detail) return;

      setIsPreparationModeEnabled(detail.enabled);
      localStorage.setItem(
        "preparationModeEnabled",
        detail.enabled ? "true" : "false",
      );
      if (!detail.enabled) {
        setPreparationNotification(null);
      }
    };

    window.addEventListener(
      "preparation:mode-change",
      handlePreparationModeChange,
    );

    return () =>
      window.removeEventListener(
        "preparation:mode-change",
        handlePreparationModeChange,
      );
  }, []);

  useEffect(() => {
    return () => {
      if (preparationNotificationTimeout.current) {
        window.clearTimeout(preparationNotificationTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const canReceivePreparationNotifications =
      isPreparationModeEnabled &&
      isLoggedIn &&
      (user?.role === "employe" || user?.role === "admin");

    if (!canReceivePreparationNotifications) {
      knownPreparationOrderIds.current = new Set();
      currentPreparationOrders.current = [];
      overdueNotifiedOrderIds.current = new Set();
      hasLoadedPreparationOrders.current = false;
      return;
    }

    return preparateurService.subscribeToOrdersUpdates((board) => {
      currentPreparationOrders.current = board.toPrepare;
      overdueNotifiedOrderIds.current = new Set(
        [...overdueNotifiedOrderIds.current].filter((orderId) =>
          board.toPrepare.some((order) => order.id === orderId),
        ),
      );

      if (!hasLoadedPreparationOrders.current) {
        knownPreparationOrderIds.current = new Set(
          board.toPrepare.map((order) => order.id),
        );
        hasLoadedPreparationOrders.current = true;
        return;
      }

      const newOrders = board.toPrepare.filter(
        (order) => !knownPreparationOrderIds.current.has(order.id),
      );

      knownPreparationOrderIds.current = new Set(
        board.toPrepare.map((order) => order.id),
      );

      if (newOrders.length === 0) return;

      const [order] = newOrders;
      const suffix =
        newOrders.length > 1 ? ` et ${newOrders.length - 1} autre(s)` : "";
      const customerName = getPreparationCustomerName(order);
      const itemsCount = getPreparationItemsCount(order);

      showPreparationNotification({
        orderId: order.id,
        type: order.type,
        message: `${getPreparationNotificationMessage(order)}${suffix}`,
        customerName,
        total: order.transaction.total,
        itemsCount,
      });
    });
  }, [
    isLoggedIn,
    isPreparationModeEnabled,
    showPreparationNotification,
    user?.role,
  ]);

  useEffect(() => {
    const canReceivePreparationNotifications =
      isPreparationModeEnabled &&
      isLoggedIn &&
      (user?.role === "employe" || user?.role === "admin");

    if (!canReceivePreparationNotifications) return;

    const notifyOverdueOrder = () => {
      const overdueOrder = currentPreparationOrders.current.find(
        (order) =>
          isPreparationOrderOverdue(order) &&
          !overdueNotifiedOrderIds.current.has(order.id),
      );

      if (!overdueOrder) return;

      overdueNotifiedOrderIds.current.add(overdueOrder.id);
      showPreparationNotification({
        orderId: overdueOrder.id,
        type: overdueOrder.type,
        variant: "overdue",
        message: getPreparationOverdueMessage(overdueOrder),
        customerName: getPreparationCustomerName(overdueOrder),
        total: overdueOrder.transaction.total,
        itemsCount: getPreparationItemsCount(overdueOrder),
      });
    };

    notifyOverdueOrder();
    const intervalId = window.setInterval(notifyOverdueOrder, 60000);

    return () => window.clearInterval(intervalId);
  }, [
    isLoggedIn,
    isPreparationModeEnabled,
    showPreparationNotification,
    user?.role,
  ]);

  // getActiveOrder pour remplir suivi comande
  useEffect(() => {
    if (!isLoggedIn) {
      setActiveCommande(null);
      return;
    }

    ordersService
      .getActiveOrder()
      .then((commande) => handleCommandeUpdate(commande))
      .catch((err) => {
        if (!err.message?.includes("404")) console.error(err);
        handleCommandeUpdate(null);
      });
  }, [isLoggedIn]);

  useEffect(() => {
    const handleClickOutsideCart = (event: MouseEvent) => {
      if (
        isCartOpen &&
        cartPopupRef.current &&
        !cartPopupRef.current.contains(event.target as Node) &&
        cartBtnDesktopRef.current &&
        !cartBtnDesktopRef.current.contains(event.target as Node)
      ) {
        setIsCartOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideCart);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideCart);
    };
  }, [isCartOpen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Email verification token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const type = urlParams.get("type") ?? "email-verification";
    if (token && !hasVerified.current) {
      hasVerified.current = true;
      authService
        .verifyEmailToken(token, type)
        .then((res) => {
          setNotification({
            type: "success",
            text: res.message || "Courriel vérifié avec succès !",
          });
          if (type === "email-change") {
            if (res.user) updateUser(res.user);
            navigate("/profil");
          } else {
            navigate("/accueil");
            setIsAuthOpen(true);
          }
        })
        .catch((err) => {
          setNotification({
            type: "error",
            text: err.message || "Lien invalide ou expiré.",
          });
          navigate("/accueil", { replace: true });
        });
      setTimeout(() => setNotification(null), 3000);
    }
  }, [navigate]);

  // Synchronisation de la session au retour sur l'onglet
  useEffect(() => {
    const handleFocus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/getSession`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.user) updateUser(data.user);
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Synchronisation commande apres transaction
  useEffect(() => {
    const handleCommandeRefresh = () => {
      if (!isLoggedIn) return;
      ordersService
        .getActiveOrder()
        .then((commande) => handleCommandeUpdate(commande))
        .catch((err) => {
          if (!err.message?.includes("404")) console.error(err);
          handleCommandeUpdate(null);
        });
    };

    window.addEventListener("commande:refresh", handleCommandeRefresh);
    return () =>
      window.removeEventListener("commande:refresh", handleCommandeRefresh);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;

    return ordersService.subscribeToActiveOrderEvents((event) => {
      setNotification({
        type: "error",
        text:
          event.message ??
          "Délais de commande expiré, transaction remboursée par crédit",
      });
      window.setTimeout(() => setNotification(null), 5000);

      ordersService
        .getActiveOrder()
        .then((commande) => handleCommandeUpdate(commande))
        .catch((err) => {
          if (!err.message?.includes("404")) console.error(err);
          handleCommandeUpdate(null);
        });
      window.dispatchEvent(new Event("credit:refresh"));
    });
  }, [isLoggedIn]);

  // Synchronisation etat commande avec polling chaque 5 seg
  useEffect(() => {
    if (!isLoggedIn || !activeCommande) return;

    const interval = window.setInterval(() => {
      ordersService
        .getActiveOrder()
        .then((commande) => handleCommandeUpdate(commande))
        .catch((err) => {
          if (!err.message?.includes("404")) console.error(err);
          handleCommandeUpdate(null);
        });
    }, 5000); // toutes les 5 secondes

    return () => window.clearInterval(interval);
  }, [isLoggedIn, activeCommande]);

  useEffect(() => {
    const handleClickOutsideCommande = (event: MouseEvent) => {
      if (
        isCommandeOpen &&
        commandePopupRef.current &&
        !commandePopupRef.current.contains(event.target as Node) &&
        commandeBtnDesktopRef.current &&
        !commandeBtnDesktopRef.current.contains(event.target as Node)
      ) {
        setIsCommandeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideCommande);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideCommande);
  }, [isCommandeOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const avatarSrc = user?.profilePicture
    ? user.profilePicture.startsWith("http")
      ? user.profilePicture
      : `${API_URL}${user.profilePicture}`
    : defaultAvatar;

  const displayName = user?.firstName
    ? user.firstName.charAt(0).toUpperCase() +
    user.firstName.slice(1).toLowerCase()
    : "";

  const renderNavLinks = (onClick?: () => void) => (
    <>
      {isLoggedIn && user?.role === "admin" && (
        <>
          <NavLink className="nav-link" to="/admin/inventory" onClick={onClick}>
            Inventaire
          </NavLink>
          <NavLink
            className="nav-link"
            to="/admin/promotions"
            onClick={onClick}
          >
            Promotions
          </NavLink>
          <NavLink className="nav-link" to="/admin/ventes" onClick={onClick}>
            Ventes
          </NavLink>
          <NavLink className="nav-link" to="/admin/clients" onClick={onClick}>
            Clients
          </NavLink>
          <NavLink className="nav-link" to="/admin/commandes" onClick={onClick}>
            Commandes
          </NavLink>
          <NavLink className="nav-link" to="/admin/faq" onClick={onClick}>
            FAQ Admin
          </NavLink>
          <NavLink
            className="nav-link"
            to="/admin/restricted-words"
            onClick={onClick}
          >
            Censure
          </NavLink>

          <NavDropdown
            label="Employé"
            isActive={[
              "/preparateur",
              "/suivi-commandes",
              "/livraison",
            ].includes(location.pathname)}
          >
            <NavLink
              className="dropdown-link"
              to="/preparateur"
              onClick={onClick}
            >
              Préparation
            </NavLink>
            <NavLink
              className="dropdown-link"
              to="/suivi-commandes"
              onClick={onClick}
            >
              Suivi
            </NavLink>
            <NavLink
              className="dropdown-link"
              to="/livraison"
              onClick={onClick}
            >
              Livraison
            </NavLink>
            <NavLink
              className="dropdown-link"
              to="/livreur/dashboard"
              onClick={onClick}
            >
              Dashboard
            </NavLink>
          </NavDropdown>

          <NavDropdown
            label="Utilisateur"
            isActive={["/products", "/faq"].includes(location.pathname)}
          >
            <NavLink className="dropdown-link" to="/products" onClick={onClick}>
              Produits
            </NavLink>
            <NavLink className="dropdown-link" to="/faq" onClick={onClick}>
              FAQ
            </NavLink>
          </NavDropdown>

          <button
            className={`nav-link ${isHelpOpen ? "active" : ""}`}
            onClick={() => {
              setIsHelpOpen(!isHelpOpen);
              clearHelp();
              if (onClick) onClick();
            }}
            type="button"
          >
            <HelpCircle size={20} />
          </button>
        </>
      )}

      {isLoggedIn && user?.role === "employe" && (
        <>
          <NavLink className="nav-link" to="/preparateur" onClick={onClick}>
            Préparation
          </NavLink>
          <NavLink className="nav-link" to="/suivi-commandes" onClick={onClick}>
            Suivi
          </NavLink>
          <NavLink className="nav-link" to="/livraison" onClick={onClick}>
            Livraison
          </NavLink>
          <NavLink
            className="nav-link"
            to="/livreur/dashboard"
            onClick={onClick}
          >
            Dashboard
          </NavLink>

          <NavDropdown
            label="Utilisateur"
            isActive={["/faq"].includes(location.pathname)}
          >
            <NavLink className="dropdown-link" to="/products" onClick={onClick}>
              Produits
            </NavLink>
            <NavLink className="dropdown-link" to="/faq" onClick={onClick}>
              FAQ
            </NavLink>
          </NavDropdown>

          <button
            className={`nav-link ${isHelpOpen ? "active" : ""}`}
            onClick={() => {
              setIsHelpOpen(!isHelpOpen);
              clearHelp();
              if (onClick) onClick();
            }}
            type="button"
          >
            <HelpCircle size={20} />
          </button>
        </>
      )}

      {(!isLoggedIn ||
        (user?.role !== "admin" && user?.role !== "employe")) && (
          <>
            <NavLink className="nav-link" to="/products" onClick={onClick}>
              Produits
            </NavLink>
            <NavLink className="nav-link" to="/faq" onClick={onClick}>
              FAQ
            </NavLink>
            <button
              className={`nav-link ${isHelpOpen ? "active" : ""}`}
              onClick={() => {
                setIsHelpOpen(!isHelpOpen);
                clearHelp();
                if (onClick) onClick();
              }}
              type="button"
            >
              <HelpCircle size={20} />
            </button>
          </>
        )}
    </>
  );

  // reinitialize le help à chaque changement de page pour éviter d'avoir une aide qui ne correspond pas au contexte
  useEffect(() => {
    clearHelp();
  }, [location.pathname]); // à chaque changement de page

  // quand on appuie sur le bouton 'Aide', vérifier si la page a une page Aide ou pas
  const showHelpPanel = isHelpOpen && isHelpAllowed(window.location.pathname);

  return (
    <div className="layout-container">
      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "86px",
            right: "20px",
            zIndex: 9999,
            backgroundColor:
              notification.type === "success" ? "#88C057" : "#ff4d4d",
            color: "white",
            padding: "14px 16px 14px 22px",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            maxWidth: "calc(100vw - 40px)",
          }}
        >
          <span>{notification.text}</span>
          <button
            type="button"
            aria-label="Fermer la notification"
            onClick={() => setNotification(null)}
            style={{
              border: "none",
              background: "transparent",
              color: "white",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: 700,
              lineHeight: 1,
              padding: 0,
            }}
          >
            X
          </button>
        </div>
      )}

      {preparationNotification && (
        <div
          className={`preparation-global-notification ${preparationNotification.variant === "overdue" ||
              preparationNotification.variant === "error"
              ? "is-overdue"
              : preparationNotification.type === "LIVRAISON"
                ? "is-delivery"
                : "is-pickup"
            }`}
        >
          <BellRing size={24} />
          <div className="preparation-global-notification__content">
            <div className="preparation-global-notification__title">
              {preparationNotification.message}
            </div>
            <div className="preparation-global-notification__meta">
              {preparationNotification.customerName && (
                <span>{preparationNotification.customerName}</span>
              )}
              {typeof preparationNotification.itemsCount === "number" && (
                <span>{preparationNotification.itemsCount} article(s)</span>
              )}
              {formatPreparationTotal(preparationNotification.total) && (
                <span>
                  {formatPreparationTotal(preparationNotification.total)}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPreparationNotification(null);
              navigate("/preparateur");
            }}
            className="preparation-global-notification__button"
          >
            Voir
          </button>
        </div>
      )}

      {/* ── CartPopup — rendu UNE SEULE FOIS, en dehors de la navbar ────────
          Position fixed sur mobile (via CSS), absolute desktop via CartPopup.css
          L'overlay mobile est géré dans CartPopup.css (.cart-popup-overlay)     */}
      {isCartOpen && (
        <>
          <div
            className="cart-popup-overlay"
            onClick={() => setIsCartOpen(false)}
          />
          <div ref={cartPopupRef}>
            <CartPopup onClose={() => setIsCartOpen(false)} />
          </div>
        </>
      )}

      {isCommandeOpen && (
        <>
          {!activeCommande && (
            <div
              className="cart-popup-overlay"
              onClick={() => setIsCommandeOpen(false)}
            />
          )}
          <div ref={commandePopupRef}>
            <CommandeModal
              isOpen={isCommandeOpen}
              onClose={() => setIsCommandeOpen(false)}
              commande={activeCommande}
            />
          </div>
        </>
      )}

      <EmployeeReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        commande={commandeToReview}
        onReviewSubmitted={() => {
          if (commandeToReview) {
            reviewedCommandeIds.current.add(commandeToReview.id);
          }
          setIsReviewOpen(false);
          setCommandeToReview(null);
        }}
      />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="navbar">
        <Link to="/accueil" className="navbar-brand">
          <img
            src="/Videos/EdouardLeRebotdev.gif"
            alt="Logo"
            className="accueil-gif"
          />
          <h1 className="navbar-logo">
            MON<span style={{ color: "#8DC640" }}>PETIT</span>UBER
          </h1>
        </Link>

        {/* Desktop links */}
        <nav className="navbar-links" aria-label="Navigation principale">
          {renderNavLinks()}
        </nav>

        {/* Desktop right */}
        <div className="navbar-right">
          {isLoggedIn && Number(creditBalance ?? 0) > 0 && (
            <span className="navbar-credit-balance">
              Solde: {Number(creditBalance ?? 0).toFixed(2)} $
            </span>
          )}

          <button
            className={`nav-icon-button ${activeCommande ? "commande-active" : ""} ${isStalled ? "commande-stalled" : ""}`}
            aria-label="Mes commandes"
            type="button"
            ref={commandeBtnDesktopRef}
            onClick={() => {
              setIsCommandeOpen((prev) => !prev);
              setIsCartOpen(false);
            }}
          >
            <span className="cart-icon">
              <CommandeIcon />
            </span>
          </button>

          <button
            ref={cartBtnDesktopRef}
            className="nav-icon-button"
            aria-label={`Panier (${count})`}
            type="button"
            onClick={() => {
              setIsCartOpen((prev) => !prev);
              setIsCommandeOpen(false);
            }}
          >
            <span className="cart-icon">
              <CartIcon />
              {count > 0 && <span className="cart-badge">{count}</span>}
            </span>
          </button>

          {isLoggedIn ? (
            <div className="user-profile-container">
              <span className="user-greeting">Bonjour {displayName}</span>
              <div className="profile-menu-wrapper" ref={menuRef}>
                <img
                  src={avatarSrc}
                  alt="Profil"
                  referrerPolicy="no-referrer"
                  className="user-avatar"
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                />
                {isProfileMenuOpen && (
                  <div className="profile-dropdown">
                    <Link
                      to="/profil"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Mon profil
                    </Link>

                    <Link
                      to="/transactions"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Mes transactions
                    </Link>
                  </div>
                )}
              </div>
              <button className="nav-button logout" onClick={logout}>
                Déconnexion
              </button>
            </div>
          ) : (
            <button
              className="nav-button login"
              onClick={() => setIsAuthOpen(true)}
            >
              Se connecter
            </button>
          )}
        </div>

        {/* Mobile icons */}
        <div className="navbar-mobile-actions">
          {isLoggedIn && Number(creditBalance ?? 0) > 0 && (
            <span className="navbar-credit-balance mobile-only-badge">
              {Number(creditBalance ?? 0).toFixed(2)} $
            </span>
          )}

          <button
            className={`nav-icon-button mobile-cart-button ${activeCommande ? "commande-active" : ""} ${isStalled ? "commande-stalled" : ""}`}
            aria-label="Mes commandes"
            type="button"
            onClick={() => {
              setIsCommandeOpen((prev) => !prev);
              setIsCartOpen(false);
            }}
          >
            <span className="cart-icon">
              <CommandeIcon />
            </span>
          </button>

          <button
            className="nav-icon-button mobile-cart-button"
            aria-label={`Panier (${count})`}
            type="button"
            onClick={() => {
              setIsCartOpen((prev) => !prev);
              setIsCommandeOpen(false);
            }}
          >
            <span className="cart-icon">
              <CartIcon />
              {count > 0 && <span className="cart-badge">{count}</span>}
            </span>
          </button>

          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ──────────────────────────────────────────────────── */}
      <div
        className={`mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}
        aria-hidden={!isMobileMenuOpen}
      >
        <nav aria-label="Navigation mobile">
          {renderNavLinks(closeMobileMenu)}
        </nav>

        <div className="mobile-drawer-bottom">
          {/* Cart dans le drawer — ferme le drawer puis ouvre le popup */}

          {isLoggedIn ? (
            <div className="mobile-user-row">
              <Link to="/profil" onClick={closeMobileMenu}>
                <img src={avatarSrc} alt="Profil" className="user-avatar" />
              </Link>
              <div className="mobile-actions">
                <Link
                  to="/transactions"
                  onClick={closeMobileMenu}
                  style={{
                    display: "inline-block",
                    textDecoration: "none",
                    padding: "7px 14px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    borderRadius: "7px",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  Mes transactions
                </Link>
                <button
                  className="nav-button logout"
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                >
                  Déconnexion
                </button>
              </div>
            </div>
          ) : (
            <button
              className="nav-button login"
              onClick={() => {
                setIsAuthOpen(true);
                closeMobileMenu();
              }}
              style={{ width: "100%" }}
            >
              Se connecter
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────────────── */}
      <main
        className={`layout-main ${showHelpPanel ? "help-open" : ""}`}
        style={
          showHelpPanel
            ? ({
              "--help-width": `${helpWidth}px`,
              display: "flex",
              height: "100vh",
              overflow: "hidden"
            } as React.CSSProperties)
            : undefined
        }
      >
        <div
          style={
            showHelpPanel ? { flex: 1, overflow: "hidden" } : { width: "100%" }
          }
        >
          {routing}
        </div>
        {showHelpPanel && (
          <div className="pageHelp">
            <HelpPage
              width={helpWidth}
              onWidthChange={setHelpWidth}
              onClose={() => setIsHelpOpen(false)} />
          </div>
        )}
      </main>

      <AuthManager
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpen={() => setIsAuthOpen(true)}
      />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="layout-footer">
        <div className="footer-content">
          <p className="footer-text">
            © 2026 MONPETITUBER — Tous droits réservés
          </p>
          <div className="footer-links">
            <a href="#">Politique de confidentialité</a>
            <a href="#">Conditions d'utilisation</a>
            <a href="#">Support</a>
          </div>
        </div>
      </footer>
      <FaqBot />
    </div>
  );
}

export default App;
