import { useCart } from "../../contexts/cartContext";
import type { CartProduct } from "../../services/cartLocalService";
import { API_URL } from "../../config";
import {
  useState,
  useEffect,
  useMemo,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import "./cart.css";
import type { CartWithPromotions } from "../../services/cartService";
import { syncGuestCartToServer } from "../../services/cartService";
import { readGuestCart } from "../../services/cartLocalService";
import { useAuth } from "../../contexts/authContext";
import { useCreditBalance } from "../../hooks/useCreditBalance";
import { useLoyaltyPoints } from "../../hooks/useLoyaltyPoints";
import defaultImg from "../../assets/default-avatar.png";
import mascotte from "../../assets/mascotte-panier-vide.png";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";
import {
  useLoyaltyConfig,
  capLoyaltyPoints,
} from "../../hooks/useLoyaltyConfig";
import { configService } from "../../services/configService";

export default function CartPage() {
  const { items, removeOne, addOne, removeItem, count } = useCart();
  const { isLoggedIn } = useAuth();
  const [maxReached, setMaxReached] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<"livraison" | "ramassage">("livraison");
  const [locaux, setLocaux] = useState<string[]>([]);
  const [selectedLocalLetter, setSelectedLocalLetter] = useState("");
  const [selectedLocalNumber, setSelectedLocalNumber] = useState("");
  const [showLocalLetterSuggestions, setShowLocalLetterSuggestions] =
    useState(false);
  const [showLocalNumberSuggestions, setShowLocalNumberSuggestions] =
    useState(false);
  const [localLetterTouched, setLocalLetterTouched] = useState(false);
  const [localNumberTouched, setLocalNumberTouched] = useState(false);
  const [applyCredit, setApplyCredit] = useState(false);
  const [selectedLoyaltyPoints, setSelectedLoyaltyPoints] = useState(0);
  const [loyaltyPointsInput, setLoyaltyPointsInput] = useState("0");
  const loyaltyConfig = useLoyaltyConfig();
  const creditBalance = useCreditBalance(isLoggedIn);
  const loyaltyPoints = useLoyaltyPoints(isLoggedIn, loyaltyConfig);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [cartData, setCartData] = useState<CartWithPromotions | null>(null);
  const [bonusProductImages, setBonusProductImages] = useState<
    Record<number, string>
  >({});
  const [removedBonuses, setRemovedBonuses] = useState<Set<number>>(() => {
    // Charger les bonus supprimés depuis localStorage
    try {
      const stored = localStorage.getItem("removedBonuses");
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Erreur lors de la lecture de removedBonuses:", e);
    }
    return new Set();
  });

  useEffect(() => {
    configService
      .getLocaux()
      .then(setLocaux)
      .catch((error) => {
        console.error("Erreur lors du chargement des locaux:", error);
      });
  }, []);

  const locauxByLetter = useMemo(() => {
    const next = new Map<string, string[]>();
    const compareLocalNumbers = (a: string, b: string) => {
      const aIsNumeric = /^\d+$/.test(a);
      const bIsNumeric = /^\d+$/.test(b);
      const getNumberGroup = (value: string) => {
        if (/^0\d{2}$/.test(value)) return 0;
        if (/^0\d$/.test(value)) return 1;
        if (/^[1-9]$/.test(value)) return 2;
        if (/^[1-9]\d$/.test(value)) return 3;
        if (/^[1-9]\d{2,}$/.test(value)) return 4;
        return 5;
      };

      if (aIsNumeric && bIsNumeric) {
        return (
          getNumberGroup(a) - getNumberGroup(b) ||
          Number(a) - Number(b) ||
          a.localeCompare(b)
        );
      }

      return a.localeCompare(b, "fr-CA", { numeric: true });
    };

    locaux.forEach((local) => {
      const [letter, number] = local.split("-");
      if (!letter || !number) return;

      const numbers = next.get(letter) ?? [];
      numbers.push(number);
      next.set(letter, numbers);
    });

    next.forEach((numbers, letter) => {
      next.set(
        letter,
        [...new Set(numbers)].sort(compareLocalNumbers),
      );
    });

    return next;
  }, [locaux]);

  const localLetters = useMemo(
    () => [...locauxByLetter.keys()].sort(),
    [locauxByLetter],
  );

  const localNumbers = selectedLocalLetter
    ? (locauxByLetter.get(selectedLocalLetter) ?? [])
    : [];
  const filteredLocalLetters = localLetters.filter((letter) =>
    letter.startsWith(selectedLocalLetter),
  );
  const filteredLocalNumbers = localNumbers.filter((number) =>
    number.includes(selectedLocalNumber),
  );
  const selectedLocal =
    selectedLocalLetter && selectedLocalNumber
      ? `${selectedLocalLetter}-${selectedLocalNumber}`
      : "";
  const isSelectedLocalValid = selectedLocal
    ? locaux.includes(selectedLocal)
    : false;
  const isSelectedLocalLetterInvalid =
    selectedLocalLetter !== "" && !localLetters.includes(selectedLocalLetter);
  const isSelectedLocalNumberInvalid =
    selectedLocalLetter !== "" &&
    selectedLocalNumber !== "" &&
    !isSelectedLocalValid;
  const localValidationMessage = localLetterTouched &&
    !showLocalLetterSuggestions &&
    isSelectedLocalLetterInvalid
    ? "Entrez une lettre valide."
    : localNumberTouched &&
        !showLocalNumberSuggestions &&
        isSelectedLocalNumberInvalid
      ? "Entrez un numéro de local valide."
      : "";

  // Récupérer les données du panier avec promotions du serveur
  const fetchCartWithPromotions = async () => {
    try {
      // Pour les invités (non connectés), synchroniser d'abord le panier localStorage avec le serveur
      if (!isLoggedIn) {
        const guestItems = readGuestCart();
        if (guestItems.length > 0) {
          await syncGuestCartToServer(guestItems);
        }
      }

      const res = await fetch(`${API_URL}/api/cart/cartWithPromotions`, {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Erreur API:", res.status);
        return;
      }

      const data = (await res.json()) as CartWithPromotions;
      setCartData(data);
    } catch (err) {
      console.error("Erreur lors du fetch des promotions:", err);
    }
  };

  // Récupérer les images des produits bonus
  useEffect(() => {
    if (cartData?.bonuses && cartData.bonuses.length > 0) {
      cartData.bonuses.forEach(async (bonus) => {
        // Toujours fetch l'image pour s'assurer qu'elle est disponible
        try {
          const res = await fetch(
            `${API_URL}/api/products/getById/${bonus.bonusProductId}`,
            {
              credentials: "include",
            },
          );
          if (res.ok) {
            const product = await res.json();
            setBonusProductImages((prev) => ({
              ...prev,
              [bonus.bonusProductId]: product.imageUrl,
            }));
          } else {
            console.warn(
              `Produit bonus ${bonus.bonusProductId} non trouvé (${res.status})`,
            );
          }
        } catch (err) {
          console.error(
            `Erreur lors du fetch de l'image du produit ${bonus.bonusProductId}:`,
            err,
          );
        }
      });
    }
  }, [cartData?.bonuses?.length]);

  // Persister les bonus supprimés dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "removedBonuses",
        JSON.stringify(Array.from(removedBonuses)),
      );
    } catch (e) {
      console.error("Erreur lors de la sauvegarde de removedBonuses:", e);
    }
  }, [removedBonuses]);

  // Récupérer les promos quand le panier change (quantités ou articles)
  useEffect(() => {
    if (count > 0) {
      void fetchCartWithPromotions();
    } else {
      setCartData(null);
    }
  }, [count]);

  // Fonction qui gère le clic sur +, vérifie si le produit a atteint sa limite
  const showMaxReached = (productId: number) => {
    setMaxReached((prev) => new Set(prev).add(productId));
    setTimeout(() => {
      setMaxReached((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }, 3000);
  };

  const handleAddOne = async (productId: number, product: CartProduct) => {
    try {
      await addOne(productId, product);
      const item = items.find((i) => i.productId === productId);
      if (item && item.quantity + 1 >= item.product.stock) {
        showMaxReached(productId);
      }
    } catch {
      showMaxReached(productId);
    }
  };

  // Fonction pour supprimer un produit bonus du panier
  const handleRemoveBonus = (bonusProductId: number) => {
    setRemovedBonuses((prev) => new Set(prev).add(bonusProductId));
  };

  // Fonction pour restaurer un produit bonus supprimé
  const handleRestoreBonus = (bonusProductId: number) => {
    setRemovedBonuses((prev) => {
      const next = new Set(prev);
      next.delete(bonusProductId);
      return next;
    });
  };

  // Calcul du sous-total avec les promotions appliquées du serveur
  const subtotal =
    cartData?.total ??
    items.reduce(
      (acc, item) => acc + item.product.finalPrice * item.quantity,
      0,
    );

  const totalSavings = cartData?.totalSavings ?? 0;

  // Crédit client affiché dans le récapitulatif: il vient de GET /api/user/credit.
  // Ce calcul sert seulement à l'affichage; le backend recalculera le vrai crédit disponible.
  const canUseCredit = isLoggedIn && creditBalance > 0;

  const cappedLoyaltyPoints = capLoyaltyPoints(loyaltyPoints, loyaltyConfig);

  const pointsByBalance = loyaltyConfig
    ? Math.floor(
        cappedLoyaltyPoints / loyaltyConfig.loyaltyRedemptionStepPoints,
      ) * loyaltyConfig.loyaltyRedemptionStepPoints
    : 0;

  // Calcul des points par total:
  // Ce calcul est basé sur le sous-total divisé par la valeur de réduction, puis multiplié par les points par étape
  const pointsByTotal = loyaltyConfig
    ? Math.floor(subtotal / loyaltyConfig.loyaltyRedemptionStepValue) *
      loyaltyConfig.loyaltyRedemptionStepPoints
    : 0;

  // Calcul des points réclamables:
  // Le nombre de points réclamables est le minimum entre les points par balance et les points par total
  const redeemableLoyaltyPoints = Math.min(pointsByBalance, pointsByTotal);

  // Vérification si les points réclamables sont suffisants pour utiliser les points de fidélité
  const canUseLoyaltyPoints =
    isLoggedIn &&
    !!loyaltyConfig &&
    redeemableLoyaltyPoints >= loyaltyConfig.loyaltyRedemptionStepPoints;
  const selectedLoyaltyPointsToUse = Math.min(
    selectedLoyaltyPoints,
    redeemableLoyaltyPoints,
  );
  const selectedLoyaltyValue = loyaltyConfig
    ? (selectedLoyaltyPointsToUse /
        loyaltyConfig.loyaltyRedemptionStepPoints) *
      loyaltyConfig.loyaltyRedemptionStepValue
    : 0;
  const applyLoyaltyPoints = selectedLoyaltyPointsToUse > 0;
  const loyaltyDiscount = applyLoyaltyPoints ? selectedLoyaltyValue : 0;
  // Calcul des points disponibles pour utilisation:
  // Les points disponibles pour utilisation sont égaux au nombre de points réclamables
  const availableLoyaltyPointsToUse = redeemableLoyaltyPoints;
  // Calcul des points à utiliser:
  // Si la réduction de points de fidélité est supérieure à 0 et que l'utilisateur souhaite utiliser les points de fidélité, les points à utiliser sont égaux au nombre de points réclamables
  const loyaltyPointsToUse = applyLoyaltyPoints
    ? selectedLoyaltyPointsToUse
    : 0;
  // Calcul du sous-total après réduction de points de fidélité.
  const subtotalAfterPoints = Math.max(
    subtotal - (applyLoyaltyPoints ? loyaltyDiscount : 0),
    0,
  );
  const loyaltyPointsCoverTotal = applyLoyaltyPoints && subtotalAfterPoints <= 0;
  const canApplyCreditToOrder = canUseCredit && !loyaltyPointsCoverTotal;
  // Désactive le crédit si les points sélectionnés couvrent déjà tout le total.
  const shouldApplyCredit = canApplyCreditToOrder && applyCredit;
  // Calcul du montant de crédit à appliquer:
  // Si l'application de crédit est activée et que le solde de crédit est supérieur à 0, le montant de crédit à appliquer est le minimum entre le solde de crédit et le sous-total après réduction de points de fidélité
  const creditToApply = shouldApplyCredit
    ? Math.min(creditBalance, subtotalAfterPoints)
    : 0;
  const totalAfterRewards = Math.max(subtotalAfterPoints - creditToApply, 0);
  const estimatedLoyaltyPointsEarned =
    isLoggedIn && loyaltyConfig
      ? Math.min(
          Math.floor(totalAfterRewards * loyaltyConfig.loyaltyPointsPerDollar),
          Math.max(loyaltyConfig.loyaltyMaxPoints - cappedLoyaltyPoints, 0),
        )
      : 0;

  const normalizeSelectedLoyaltyPoints = (value: number) => {
    if (!loyaltyConfig || !canUseLoyaltyPoints) return 0;

    const safeValue = Number.isFinite(value)
      ? Math.max(Math.trunc(value), 0)
      : 0;
    const rounded =
      Math.round(safeValue / loyaltyConfig.loyaltyRedemptionStepPoints) *
      loyaltyConfig.loyaltyRedemptionStepPoints;

    return Math.min(Math.max(rounded, 0), redeemableLoyaltyPoints);
  };

  const commitSelectedLoyaltyPoints = (value: number) => {
    const normalized = normalizeSelectedLoyaltyPoints(value);

    setSelectedLoyaltyPoints(normalized);
    setLoyaltyPointsInput(String(normalized));
  };

  const handleLoyaltyPointsInputChange = (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    setLoyaltyPointsInput(e.target.value.replace(/\D/g, ""));
  };

  const handleLoyaltyPointsInputBlur = () => {
    commitSelectedLoyaltyPoints(Number(loyaltyPointsInput || 0));
  };

  const handleLoyaltyPointsInputKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  useEffect(() => {
    setSelectedLoyaltyPoints((current) => {
      if (!canUseLoyaltyPoints || !loyaltyConfig) {
        return current === 0 ? current : 0;
      }

      const capped = Math.min(current, redeemableLoyaltyPoints);
      const stepped =
        Math.floor(capped / loyaltyConfig.loyaltyRedemptionStepPoints) *
        loyaltyConfig.loyaltyRedemptionStepPoints;

      return stepped === current ? current : stepped;
    });
  }, [canUseLoyaltyPoints, loyaltyConfig, redeemableLoyaltyPoints]);

  useEffect(() => {
    setLoyaltyPointsInput(String(selectedLoyaltyPointsToUse));
  }, [selectedLoyaltyPointsToUse]);

  useEffect(() => {
    if (loyaltyPointsCoverTotal && applyCredit) {
      setApplyCredit(false);
    }
  }, [loyaltyPointsCoverTotal, applyCredit]);

  const [isRedirecting, setIsRedirecting] = useState(false);

  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
  const { helpProps } = useHelpSystem();

  const adjustSelectedLoyaltyPoints = (stepDirection: -1 | 1) => {
    if (!loyaltyConfig) return;

    commitSelectedLoyaltyPoints(
      selectedLoyaltyPointsToUse +
        stepDirection * loyaltyConfig.loyaltyRedemptionStepPoints,
    );
  };

  // Envoie le choix "applyCredit" au backend via POST /api/checkout/create-session.
  // Le backend transmet ensuite ce choix à createCheckoutSession, qui crée la session Stripe.
  const handleCheckout = async () => {
    if (!isLoggedIn) {
      alert("Vous devez être connecté pour passer une commande.");
      return;
    }

    if (mode === "livraison" && !isSelectedLocalValid) {
      setCheckoutError("Veuillez sélectionner un local de livraison valide.");
      return;
    }

    // Redirection vers la page de checkout si l'utilisateur est connecté et la requête est réussie
    setIsRedirecting(true);
    setCheckoutError(null);
    try {
      // Envoi vers le backend: fulfillmentMode + applyCredit.
      // Si Stripe renvoie une URL, on redirige ensuite le client vers Stripe Checkout.
      const res = await fetch(`${API_URL}/api/checkout/create-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fulfillmentMode: mode,
          local: mode === "livraison" ? selectedLocal : undefined,
          applyCredit: shouldApplyCredit,
          applyLoyaltyPoints: loyaltyPointsToUse > 0,
          loyaltyPointsToUse,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setCheckoutError(data.error || "Impossible de créer la session Stripe.");
      setIsRedirecting(false);
    } catch (err) {
      console.error("Erreur checkout:", err);
      setCheckoutError("Impossible de créer la session Stripe.");
      setIsRedirecting(false);
    }
  };

  return (
    <div className="cart__wrapper">
      <div className="cart__header">
        <div>
          <h1 className="cart__title">Mon panier</h1>
          <p className="cart__subtitle">{items.length} article(s)</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div
          className="cart__empty"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <img
            src={mascotte}
            alt="Mascotte panier vide"
            style={{
              width: "550px",
              maxWidth: "100%",
              animation: "slideUpFade 0.6s ease-out forwards",
            }}
          />
          <p style={{ margin: 0 }}>Votre panier est vide.</p>
        </div>
      ) : (
        <div className="cart__layout">
          <ul className="cart__list" {...helpProps("cart-items")}>
            {/* Construire une liste de rendu qui inclut les items réels + les bonus offerts côté serveur */}
            {(() => {
              const displayItems = [...items];

              if (cartData?.bonuses && cartData.bonuses.length > 0) {
                cartData.bonuses.forEach((bonus, i) => {
                  // Ne pas afficher les bonus supprimés
                  if (removedBonuses.has(bonus.bonusProductId)) {
                    return;
                  }
                  // Générer un ID unique négatif pour le bonus
                  const uniqueBonusId = -(1000 + i);
                  // Récupérer l'image du produit bonus depuis le cache, utiliser l'image par défaut sinon
                  const bonusImageUrl =
                    bonusProductImages[bonus.bonusProductId] || undefined;
                  // Ajouter un item factice pour affichage du bonus (prix 0)
                  displayItems.push({
                    productId: uniqueBonusId,
                    quantity: bonus.bonusQuantity,
                    product: {
                      id: uniqueBonusId,
                      name: bonus.bonusProductName,
                      price: 0,
                      finalPrice: 0,
                      imageUrl: bonusImageUrl || defaultImg,
                      stock: 0,
                    },
                    __isBonus: true,
                    __bonusMeta: bonus,
                    __bonusProductId: bonus.bonusProductId,
                  } as any);
                });
              }

              return displayItems.map((item: any, index: number) => {
                const isBonus = !!item.__isBonus;
                const bonusMeta = item.__bonusMeta as any | undefined;

                const imgSrc = item.product.imageUrl
                  ? item.product.imageUrl.startsWith("http")
                    ? item.product.imageUrl
                    : `${API_URL}${item.product.imageUrl}`
                  : undefined;

                // Trouver les données de promo pour ce produit dans cartData (si ce n'est pas un bonus)
                const promoItem = !isBonus
                  ? cartData?.items?.find((i) => i.productId === item.productId)
                  : undefined;
                const finalTotal =
                  promoItem?.finalTotal ??
                  item.product.finalPrice * item.quantity;
                const itemSavings = promoItem?.savings ?? (isBonus ? 0 : 0);

                return (
                  <li
                    key={isBonus ? `bonus-${item.productId}` : item.productId}
                    className="cart__row-wrapper"
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    <div className="cart__row">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={item.product.name}
                          className="cart__row-img"
                        />
                      ) : (
                        <div className="cart__row-img cart__row-img--placeholder" />
                      )}

                      <div className="cart__row-info">
                        <span className="cart__row-name">
                          {item.product.name}
                          {isBonus && (
                            <span className="cart__row-badge"> • Offert</span>
                          )}
                        </span>
                        {/*
                        <span className="cart__row-price">
                          {item.product.finalPrice} $
                        </span>
                        */}
                        {isBonus && bonusMeta && (
                          <div className="cart__row-bonus-trigger">
                            Offert avec : {bonusMeta.triggerProductName}
                          </div>
                        )}
                      </div>

                      <div className="cart__row-qty-wrapper">
                        <div className="cart__row-qty">
                          {isBonus ? (
                            <span>{item.quantity}</span>
                          ) : (
                            <>
                              <button
                                onClick={() => removeOne(item.productId)}
                                disabled={item.quantity <= 1}
                              >
                                −
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                onClick={() =>
                                  handleAddOne(item.productId, item.product)
                                }
                                disabled={item.quantity >= item.product.stock}
                              >
                                +
                              </button>
                            </>
                          )}
                        </div>
                        {maxReached.has(item.productId) && (
                          <span className="cart__row-max">
                            Stock max atteint
                          </span>
                        )}
                      </div>

                      <span className="cart__row-total">
                        <span className="cart__row-total-price">
                          {finalTotal.toFixed(2)} $
                        </span>
                        {itemSavings > 0 && (
                          <span className="cart__row-savings">
                            -{itemSavings.toFixed(2)} $
                          </span>
                        )}
                      </span>

                      {!isBonus && (
                        <button
                          className="cart__row-delete"
                          onClick={() => removeItem(item.productId)}
                        >
                          Retirer
                        </button>
                      )}

                      {isBonus && (
                        <button
                          className="cart__row-delete cart__row-delete--bonus"
                          onClick={() =>
                            handleRemoveBonus(item.__bonusProductId)
                          }
                          title="Refuser cet article offert"
                        >
                          Refuser
                        </button>
                      )}
                    </div>
                  </li>
                );
              });
            })()}
          </ul>

          <div className="cart__panel">
            {/* Option livraison / ramassage */}
            <label htmlFor="delivery-toggle" className="cart__delivery-switch" {...helpProps("cart-delivery")}>
              <input
                type="checkbox"
                id="delivery-toggle"
                checked={mode === "ramassage"}
                onChange={(e) =>
                  setMode(e.target.checked ? "ramassage" : "livraison")
                }
              />
              <span>Livraison</span>
              <span>Ramassage</span>
            </label>

            {mode === "livraison" && (
              <div className="cart__local-selector" {...helpProps("local-selector")}>
                <div className="cart__local-selector-header">
                  <span>Local de livraison</span>
                  {selectedLocal && isSelectedLocalValid && (
                    <strong>{selectedLocal}</strong>
                  )}
                </div>
                <div className="cart__local-selects">
                  <label>
                    <span>Lettre</span>
                    <input
                      className={
                        localLetterTouched &&
                        !showLocalLetterSuggestions &&
                        isSelectedLocalLetterInvalid
                          ? "cart__local-input--invalid"
                          : undefined
                      }
                      type="text"
                      value={selectedLocalLetter}
                      onChange={(event) => {
                        setSelectedLocalLetter(
                          event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z]/g, "")
                            .slice(0, 1),
                        );
                        setSelectedLocalNumber("");
                      }}
                      onFocus={() => setShowLocalLetterSuggestions(true)}
                      onBlur={() => {
                        setLocalLetterTouched(true);
                        window.setTimeout(
                          () => setShowLocalLetterSuggestions(false),
                          120,
                        );
                      }}
                      placeholder="Lettre"
                    />
                    {showLocalLetterSuggestions && (
                      <div className="cart__local-suggestions">
                        {filteredLocalLetters.map((letter) => (
                          <button
                            key={letter}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setSelectedLocalLetter(letter);
                              setSelectedLocalNumber("");
                              setShowLocalLetterSuggestions(false);
                            }}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                  <label>
                    <span>Numéro</span>
                    <input
                      className={
                        localNumberTouched &&
                        !showLocalNumberSuggestions &&
                        isSelectedLocalNumberInvalid
                          ? "cart__local-input--invalid"
                          : undefined
                      }
                      type="text"
                      inputMode="numeric"
                      value={selectedLocalNumber}
                      onChange={(event) =>
                        setSelectedLocalNumber(
                          event.target.value.replace(/\D/g, "").slice(0, 4),
                        )
                      }
                      disabled={!selectedLocalLetter}
                      onFocus={() => setShowLocalNumberSuggestions(true)}
                      onBlur={() => {
                        setLocalNumberTouched(true);
                        window.setTimeout(
                          () => setShowLocalNumberSuggestions(false),
                          120,
                        );
                      }}
                      placeholder="Numéro"
                    />
                    {showLocalNumberSuggestions && selectedLocalLetter && (
                      <div className="cart__local-suggestions">
                        {filteredLocalNumbers.map((number) => (
                          <button
                            key={number}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setSelectedLocalNumber(number);
                              setShowLocalNumberSuggestions(false);
                            }}
                          >
                            {number}
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                </div>
                {localValidationMessage && (
                  <p className="cart__local-error">{localValidationMessage}</p>
                )}
              </div>
            )}

            {/* Totaux */}
            {cartData && cartData.items.length > 0 && (
              <div className="cart__panel-line" {...helpProps("cart-totals")}>
                <span>Prix avant promo</span>
                <span>
                  {cartData.items
                    .reduce((acc, item) => acc + item.originalTotal, 0)
                    .toFixed(2)}{" "}
                  $
                </span>
              </div>
            )}
            {totalSavings > 0 && (
              <div className="cart__panel-line cart__panel-line--savings" {...helpProps("cart-totals")}>
                <span>Économies</span>
                <span style={{ color: "#10b981" }}>
                  -{totalSavings.toFixed(2)} $
                </span>
              </div>
            )}
            <div className="cart__panel-line" {...helpProps("cart-totals")}>
              <span>Sous-total</span>
              <span>{subtotal.toFixed(2)} $</span>
            </div>
            {mode === "livraison" && (
              <div className="cart__panel-line">
                <span>Livraison</span>
                <span>Gratuit</span>
              </div>
            )}
            {/* Affiche l'option crédit seulement si le client connecté a un solde positif. */}
            {canUseCredit && (
              <div
                className={`cart__credit cart__credit--balance${
                  loyaltyPointsCoverTotal ? " cart__credit--disabled" : ""
                }`}
                {...helpProps("cart-credit")}
              >
                <div className="cart__credit-header">
                  <span>Solde de crédit</span>
                  <strong>{creditBalance.toFixed(2)} $</strong>
                </div>
                <label className="cart__credit-toggle">
                  <input
                    type="checkbox"
                    checked={shouldApplyCredit}
                    disabled={loyaltyPointsCoverTotal}
                    onChange={(e) => setApplyCredit(e.target.checked)}
                  />
                  <span>Appliquer le crédit à cette commande</span>
                </label>
              </div>
            )}

            {/* carte de points */}
            {isLoggedIn && (
              <div className="cart__credit cart__credit--points">
                <div className="cart__credit-header" {...helpProps("cart-loyalty")}>
                  <span>Carte de points</span>
                  <strong>
                    {cappedLoyaltyPoints.toLocaleString("fr-CA")} pts
                  </strong>
                </div>
                {canUseLoyaltyPoints ? (
                  <div className="cart__points-selector">
                    <span className="cart__points-selector-label">
                      Points à utiliser
                    </span>
                    <div className="cart__points-stepper" {...helpProps("cart-using")}>
                      <div className="cart__points-controls">
                        <button
                          type="button"
                          onClick={() => adjustSelectedLoyaltyPoints(-1)}
                          disabled={selectedLoyaltyPointsToUse <= 0}
                          aria-label="Retirer une tranche de points"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustSelectedLoyaltyPoints(1)}
                          disabled={
                            selectedLoyaltyPointsToUse >=
                            availableLoyaltyPointsToUse
                          }
                          aria-label="Ajouter une tranche de points"
                        >
                          +
                        </button>
                      </div>
                      <div className="cart__points-selected">
                        <div className="cart__points-input-wrap">
                          <input
                            className="cart__points-input"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={loyaltyPointsInput}
                            onChange={handleLoyaltyPointsInputChange}
                            onBlur={handleLoyaltyPointsInputBlur}
                            onKeyDown={handleLoyaltyPointsInputKeyDown}
                            onFocus={(e) => e.currentTarget.select()}
                            aria-label="Nombre de points à utiliser"
                          />
                          <span className="cart__points-unit">pts</span>
                        </div>
                      </div>
                    </div>
                    <div className="cart__points-meta">
                      <span className="cart__points-note">
                        Maximum:{" "}
                        {availableLoyaltyPointsToUse.toLocaleString("fr-CA")}{" "}
                        pts
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="cart__points-note">
                    {loyaltyConfig
                      ? `Seuil minimum: ${loyaltyConfig.loyaltyRedemptionStepPoints.toLocaleString("fr-CA")} pts pour ${loyaltyConfig.loyaltyRedemptionStepValue.toFixed(2)} $`
                      : "Chargement de la carte de points..."}
                  </div>
                )}
              </div>
            )}
            {applyLoyaltyPoints && loyaltyDiscount > 0 && (
              <div className="cart__panel-line cart__panel-line--credit">
                <span>Points appliqués</span>
                <span>-{loyaltyDiscount.toFixed(2)} $</span>
              </div>
            )}
            {creditToApply > 0 && (
              <div className="cart__panel-line cart__panel-line--credit">
                <span>Crédit appliqué</span>
                <span>-{creditToApply.toFixed(2)} $</span>
              </div>
            )}

            <div className="cart__panel-total">
              <span>Total</span>
              <span>{totalAfterRewards.toFixed(2)} $</span>
            </div>
            {isLoggedIn && (
              <div className="cart__points-earn cart__points-earn--total">
                <span className="cart__points-earn-label">
                  À gagner si la commande est complétée:
                </span>
                <strong>
                  +{estimatedLoyaltyPointsEarned.toLocaleString("fr-CA")} pts
                </strong>
              </div>
            )}
            {checkoutError && (
              <div className="cart__panel-error">{checkoutError}</div>
            )}

            <button
              className="cart__panel-cta"
              onClick={handleCheckout}
              disabled={
                isRedirecting || (mode === "livraison" && !isSelectedLocalValid)
              }
               {...helpProps("cart-checkout")}
            >
              {isRedirecting ? "Redirection..." : "Valider la commande"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
