import "./accueil.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  promotionService,
  type Promotion,
} from "../../services/promotionService";
import { API_URL } from "../../config";

export interface AccueilProps {}

interface Product {
  id: number;
  name: string;
  imageUrl: string;
  price: number;
  sale: number;
  finalPrice?: number;
}

// On étend l'interface Promotion pour y ajouter l'image qu'on va récupérer
interface PromotionWithImage extends Promotion {
  displayImageUrl?: string;
}

export default function Accueil({}: AccueilProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [promotions, setPromotions] = useState<PromotionWithImage[]>([]);
  const [topDiscounts, setTopDiscounts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const productsRes = await fetch(`${API_URL}/api/products/getAll`);
        const allProducts: Product[] = await productsRes.json();

        const discounted = allProducts.filter((p) => p.sale > 0);
        discounted.sort((a, b) => b.sale - a.sale);
        setTopDiscounts(discounted.slice(0, 10));

        const allPromos = await promotionService.getAllPromotions();

        const now = new Date();
        const activePromos = allPromos.filter(
          (promo) => promo.isActive && new Date(promo.endDate) > now,
        );

        const promosWithImages = activePromos.map((promo) => {
          const targetProduct = allProducts.find(
            (p) => p.id === promo.targetProductId,
          );
          return {
            ...promo,
            displayImageUrl: targetProduct?.imageUrl,
          };
        });

        setPromotions(promosWithImages.slice(0, 3));
      } catch (error) {
        console.error(
          "Erreur lors du chargement des données de l'accueil",
          error,
        );
      }
    };

    fetchHomeData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate(`/products`);
    }
  };

  return (
    <div className="accueil">
      <div className="accueil-content">
        {/* Section Gauche (Image statique) */}
        <div className="accueil-livraison">
          <img src="/Images/Photo-Livraison.svg" alt="Photo Livraison" />
        </div>

        {/* Section Droite (Contenu dynamique) */}
        <div className="accueil-droite">
          <div className="accueil-texte">
            <h2 className="accueil-titre">
              Tes envies.
              <br />
              Livrées.
              <br />
              Rapidement.
            </h2>
            <p className="accueil-description">
              Nourriture locale, merch exclusive. En classe, en moins de 30
              minutes.
            </p>
          </div>

          {/* Barre de recherche */}
          <form className="accueil-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Rechercher un produit..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="search-btn">
              Trouver
            </button>
          </form>

          {/* Section 1 : Promotions en cours (Affichée seulement s'il y en a) */}
          {promotions.length > 0 && (
            <div className="accueil-collection">
              <h3 className="section-title">🔥 Promotions en cours</h3>
              <div className="collection-images">
                {promotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="promo-item"
                    onClick={() =>
                      navigate(
                        `/products?q=${encodeURIComponent(promo.targetProduct?.name || "")}`,
                      )
                    }
                  >
                    <div className="promo-badge">
                      {promo.type === "BUY_X_GET_Y"
                        ? `${promo.quantity} pour ${promo.bonusQuantity}`
                        : "Cadeau"}
                    </div>
                    <img
                      src={
                        promo.displayImageUrl?.startsWith("http")
                          ? promo.displayImageUrl
                          : `${API_URL}${promo.displayImageUrl}`
                      }
                      alt={promo.name}
                      onError={(e) =>
                        (e.currentTarget.src = "/Images/placeholder.png")
                      }
                    />
                    <p className="promo-name">{promo.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2 : Top 10 Rabais en Carrousel */}
          {topDiscounts.length > 0 && (
            <div className="accueil-collection mt-4">
              <h3 className="section-title">
                💸 Top {topDiscounts.length} des plus gros rabais
              </h3>
              <div className="carousel-container">
                <div className="carousel-track">
                  {/* On double le tableau pour créer une boucle infinie sans coupure */}
                  {[...topDiscounts, ...topDiscounts].map((product, index) => (
                    <div
                      key={`${product.id}-${index}`}
                      className="promo-item"
                      onClick={() =>
                        navigate(
                          `/products?q=${encodeURIComponent(product.name)}`,
                        )
                      }
                    >
                      <div className="discount-badge">-{product.sale}%</div>
                      <img
                        src={
                          product.imageUrl?.startsWith("http")
                            ? product.imageUrl
                            : `${API_URL}${product.imageUrl}`
                        }
                        alt={product.name}
                        onError={(e) =>
                          (e.currentTarget.src = "/Images/placeholder.png")
                        }
                      />
                      <p className="promo-name">{product.name}</p>
                      <p className="promo-price">
                        <span className="old-price">
                          {product.price.toFixed(2)}$
                        </span>
                        <span className="new-price">
                          {(
                            product.finalPrice ??
                            product.price * (1 - product.sale / 100)
                          ).toFixed(2)}
                          $
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
