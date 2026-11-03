import "./card.css";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardActions from "@mui/material/CardActions";
import IconButton from "@mui/material/IconButton";
import { useCart } from "../../contexts/cartContext";
import { toCartProduct } from "../../services/cartLocalService";
import DetailsModal from "../details/details";
import type { Product } from "../../models";
import { useState } from "react";
import { PromotionBadge } from "../promotions/PromotionBadge";
import type { Promotion } from "../../services/promotionService";
import { API_URL } from "../../config";
import { PriceDisplay } from "../common/PriceDisplay";
import CheckBoxOutlineBlankOutlinedIcon from "@mui/icons-material/CheckBoxOutlineBlankOutlined";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import AddIcon from "@mui/icons-material/Add";
import type { ProductReview } from "../../models";
import { productReviewService } from "../../services/productReviewService";

interface ProductCardProps {
  product: Product;
  selectedProducts: Product[];
  setSelectedProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  promotions?: Promotion[];
}

export default function ProductCard({
  product,
  selectedProducts,
  setSelectedProducts,
  promotions = [],
}: ProductCardProps) {
  const { addOne } = useCart();
  const isChecked = selectedProducts.some((p) => p.id === product.id);
  const [showModal, setShowModal] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);

  const handleOpenModal = async () => {
    setShowModal(true);
    try {
      const data = await productReviewService.getByProduct(product.id);
      setReviews(data.reviews ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToCart = async () => {
    try {
      await addOne(product.id, toCartProduct(product));
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Erreur lors de l'ajout au panier";
      alert(message);
    }
  };

  const handleAddToSelection = () => {
    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      return exists
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product];
    });
  };



  return (
    <>
      {showModal && (
        <DetailsModal
          isOpen={showModal}
          onCommander={handleAddToCart}
          productId={product.id}
          nom={product.name}
          image={product.imageUrl?.startsWith("http") ? product.imageUrl : `${API_URL}${product.imageUrl}?t=${Date.now()}`}
          description={product.description}
          reviews={reviews}
          categorie={product.category}
          categorieColor={product.categoryColor}
          prix={product.price}
          prixFinal={product.finalPrice}
          sale={product.sale}
          stock={product.stock}
          onClose={() => setShowModal(false)}
        />
      )}

      <Card
        className={`inventory-card ${promotions.length > 0 ? "inventory-card--promo" : ""}`}
      >
        {product.stock == 0 && (
          <div className="ribbon">Indisponible</div>
        )
        }

        <div className="image-wrapper" onClick={handleOpenModal}>
          <img
            className="inventory-image"
            src={
              product.imageUrl?.startsWith("http")
                ? product.imageUrl
                : `${API_URL}${product.imageUrl}?t=${Date.now()}`
            }
            alt={product.name}
          />
          <div className="image-overlay">
            <span className="overlay-label">Voir les détails</span>
          </div>
        </div>

        {promotions.length > 0 && (
          <div className="promo-container">
            {promotions.map((promo) => (
              <PromotionBadge
                key={promo.id}
                type={promo.type}
                name={promo.name}
                description={promo.description}
                quantity={promo.quantity}
                bonusQuantity={promo.bonusQuantity}
                startDate={promo.startDate}
                endDate={promo.endDate}
                bonusProductName={promo.bonusProduct?.name}
              />
            ))}
          </div>
        )}

        <div className="inventory-body">
          <div className="card-name-price-row">
            <CardHeader
              title={product.name}
              disableTypography={false}
              sx={{ p: 0 }}
            />

            <PriceDisplay
              price={product.price}
              finalPrice={product.finalPrice}
              sale={product.sale}
              showBadge={true}
              className="card-price"
            />
          </div>
        </div>

        <CardActions className="card-actions" disableSpacing>
          <IconButton
            onClick={handleAddToSelection}
            color={isChecked ? "primary" : "default"}
            size="small"
            aria-label="Sélectionner"
          >
            {isChecked ? (
              <CheckBoxOutlinedIcon />
            ) : (
              <CheckBoxOutlineBlankOutlinedIcon />
            )}
          </IconButton>

          <IconButton
            onClick={handleAddToCart}
            size="small"
            aria-label="Ajouter au panier"
          >
            <AddIcon />
          </IconButton>
        </CardActions>
      </Card>
    </>
  );
}
