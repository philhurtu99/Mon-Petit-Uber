import styles from "./details.module.css";
import type { ProductReview } from "../../models";
import { API_URL } from "../../config";
import { useState } from "react";
import { productReviewService } from "../../services/productReviewService";
import HelpModal from "../helpPage/modalHelp/modalHelp";
import { useHelpSystem } from "../helpPage/hooks/useHelpSystem";


/**
 * Composant modal pour afficher les détails d'un produit
 */
interface DetailsModalProps {
  isOpen: boolean;
  productId: number;
  nom: string;
  image: string;
  description: string;
  reviews: ProductReview[];
  categorie?: string;
  categorieColor?: string;
  prix?: number;
  prixFinal?: number;
  sale?: number;
  stock?: number;
  onClose?: () => void;
  onCommander?: () => void;
}

export default function DetailsModal({
  isOpen,
  nom,
  image,
  description,
  reviews,
  categorie,
  categorieColor,
  prix,
  prixFinal,
  sale,
  stock,
  onClose,
  onCommander,
}: DetailsModalProps) {
  const [lbImages, setLbImages] = useState<string[]>([]);
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [flaggedReviews, setFlaggedReviews] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  // utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol
  const { helpProps } = useHelpSystem();

  const visibleReviews = reviews;
  const visibleStats = {
    average:
      visibleReviews.length > 0
        ? Math.round(
            (visibleReviews.reduce((sum, review) => sum + review.rating, 0) /
              visibleReviews.length) *
              10,
          ) / 10
        : 0,
    total: visibleReviews.length,
    distribution: [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: visibleReviews.filter((review) => review.rating === rating).length,
    })),
  };


  const openLightbox = (images: string[], index: number) => {
    setLbImages(images);
    setLbIndex(index);
  };

  const closeLightbox = () => setLbIndex(null);
  const goPrev = () => setLbIndex((i) => (i !== null ? Math.max(0, i - 1) : 0));
  const goNext = () => setLbIndex((i) => (i !== null ? Math.min(lbImages.length - 1, i + 1) : 0));

  const handleFlagReview = async (reviewId: number) => {
    try {
      const { status } = await productReviewService.flag(reviewId);
      if (status === 200) {
        setFlaggedReviews((prev) => new Set(prev).add(reviewId));
        setOpenMenuId(null);
        setNotification({
          message: "Commentaire signalé avec succès",
          type: "success",
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error("Erreur lors du signalement:", error);
      setNotification({
        message: "Erreur lors du signalement",
        type: "error",
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (!isOpen) return null;

  const renderStars = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };
  return (
    <>
      <div className={styles["modal-overlay"]} onMouseDown={onClose}>
        <div
          className={styles["modal-content"]}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className={styles["modal-close-btn"]}
            onClick={onClose}
            aria-label="Fermer"
          >
            &times;
          </button>

          <div className={styles["modal-header-row"]} {...helpProps("info")}>
            {image && (
              <img className={styles["modal-hero"]} src={image} alt={nom} />
            )}


            <div className={styles["modal-header-info"]}>

              <h2 className={styles["modal-title"]}>{nom}</h2>

              {categorie && (
                <span
                  className={styles["modal-category"]}
                  style={categorieColor ? { backgroundColor: categorieColor + "33", color: categorieColor } : {}}
                >
                  {categorie}
                </span>
              )}

              {prix !== undefined && (
                <div className={styles["modal-price-block"]}>
                  {sale && sale > 0 ? (
                    <>
                      <span className={styles["modal-price-final"]}>{prixFinal?.toFixed(2)} $</span>
                      <span className={styles["modal-price-original"]}>{prix.toFixed(2)} $</span>
                      <span className={styles["modal-sale-badge"]}>-{sale}%</span>
                    </>
                  ) : (
                    <span className={styles["modal-price-final"]}>{prix.toFixed(2)} $</span>
                  )}
                </div>
              )}

              {stock !== undefined && (
                <div className={styles["modal-stock"]}>
                  <span className={styles["modal-stock-dot"]} style={{ backgroundColor: stock > 0 ? "#88c057" : "#ff4d4d" }} />
                  <span className={styles["modal-stock-label"]}>
                    {stock > 0 ? `${stock} en stock` : "Indisponible"}
                  </span>
                </div>
              )}

              {visibleStats.total > 0 && (
                <div className={styles["modal-rating-row"]}>
                  <div className={styles["modal-stars-partial"]}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const fill = Math.min(1, Math.max(0, visibleStats.average - (star - 1)));
                      return (
                        <span key={star} style={{ position: "relative", display: "inline-block", color: "#9ca3af", fontSize: "20px", lineHeight: 1 }}>
                          ★
                          <span style={{
                            position: "absolute", left: 0, top: 0,
                            width: `${fill * 100}%`, overflow: "hidden", color: "#f59e0b"
                          }}>★</span>
                        </span>
                      );
                    })}
                  </div>
                  <span className={styles["modal-rating-label"]}>{visibleStats.average} ({visibleStats.total})</span>
                </div>
              )}

            </div>
          </div>
          <p className={styles["modal-description"]}>{description}</p>

          {onCommander && (
            <button className={styles["modal-cta-btn"]} onClick={onCommander} {...helpProps("add")} >
              Ajouter au panier
            </button>
          )}



          <div className={styles["modal-body"]}>
            {visibleReviews.length === 0 ? (
              <p className={styles["modal-no-comments"]}>Aucune avis</p>
            ) : (
              <div className={styles["modal-accordion"]}>
                <button
                  className={styles["modal-accordion-btn"]}
                  onClick={() => setReviewsOpen((o) => !o)}
                  {...helpProps("seeReviews")}
                >
                  <span>Avis clients ({visibleReviews.length})</span>
                  <svg
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                    style={{ transform: reviewsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                  >
                    <path d="M1 1L6 7L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {reviewsOpen && (
                  <div className={styles["modal-accordion-content"]}>

                    {visibleStats.total > 0 && (
                      <>

                        <div className={styles["modal-distribution"]}>
                          {[5, 4, 3, 2, 1].map((star) => {
                            const entry = visibleStats.distribution.find((d) => d.rating === star);
                            const count = entry?.count ?? 0;
                            const percent = Math.round((count / visibleStats.total) * 100);
                            return (
                              <div key={star} className={styles["modal-dist-row"]}>
                                <span className={styles["modal-dist-label"]}>{star}★</span>
                                <div className={styles["modal-dist-bar-bg"]}>
                                  <div
                                    className={styles["modal-dist-bar-fill"]}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className={styles["modal-dist-count"]}>{count}</span>
                              </div>

                            );
                          })}
                        </div>
                      </>
                    )}

                    {visibleReviews.map((review) => {
                      const urls = review.imagesUrl.map((url) => `${API_URL}${url}`);
                      const isReviewFlagged = flaggedReviews.has(review.id);
                      return (
                        <div key={review.id} className={styles["modal-comment"]}>
                          <div className={styles["modal-comment-header"]}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className={styles["modal-comment-author"]}>
                                {review.user.firstName} {review.user.lastName}
                              </span>
                              <span className={styles["modal-comment-date"]}>
                                · {new Date(review.createdAt).toLocaleDateString("fr-FR")}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span className={styles["modal-comment-rating"]}>
                                {renderStars(review.rating)}
                              </span>
                              <div style={{ position: "relative" }}>
                                <button
                                  onClick={() => setOpenMenuId(openMenuId === review.id ? null : review.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#88c057",
                                    cursor: "pointer",
                                    fontSize: "20px",
                                    padding: "4px 8px",
                                  }}
                                  title="Options"
                                  {...helpProps("report")}
                                >
                                  ⋯
                                </button>
                                {openMenuId === review.id && (
                                  <div
                                    className={styles["comment-menu"]}
                                    onMouseLeave={() => setOpenMenuId(null)}
                                  >
                                    <button
                                      onClick={() => handleFlagReview(review.id)}
                                      className={styles["comment-menu-item"]}
                                      style={{
                                        color: isReviewFlagged ? "#88c057" : "#ff6b6b",
                                        fontWeight: isReviewFlagged ? "600" : "normal",
                                      }}
                                    >
                                      {isReviewFlagged ? "✓ Signalé" : "Signaler"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {urls.length > 0 && (
                            <div className={styles["modal-comment-images"]}  {...helpProps("images")}>
                              {urls.map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt={`review image ${i}`}
                                  className={styles["modal-comment-img"]}
                                  onClick={() => openLightbox(urls, i)}
                                  style={{ cursor: "pointer" }}
                                />
                              ))}
                            </div>
                          )}

                          {review.comment && (
                            <div className={styles["modal-comment-content"]}>
                              {review.comment.length > 250
                                ? review.comment.slice(0, 250) + "..."
                                : review.comment}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <HelpModal
            page="details"
            isOpen={isHelpOpen == true}
            onOpen={() => setIsHelpOpen(true)}
            onClose={() => setIsHelpOpen(false)}
            variant="light"
          />
        </div>
      </div>

      {lbIndex !== null && (
        <div className={styles["lb-overlay"]} onClick={closeLightbox}>
          <button className={styles["lb-close"]} onClick={closeLightbox}>
            &times;
          </button>

          <div className={styles["lb-inner"]} onClick={(e) => e.stopPropagation()}>
            <div className={styles["lb-img-wrapper"]}>
              <button
                className={styles["lb-arrow"]}
                onClick={goPrev}
                disabled={lbIndex === 0}
              >
                <svg width="15" height="18" viewBox="2 0 11 18" fill="none">
                  <path d="M9 1L1 9L9 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <img
                src={lbImages[lbIndex]}
                alt="image"
                className={styles["lb-img"]}
              />

              <button
                className={styles["lb-arrow"]}
                onClick={goNext}
                disabled={lbIndex === lbImages.length - 1}
              >
                <svg width="15" height="18" viewBox="-2 0 11 18" fill="none">
                  <path d="M1 1L9 9L1 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <span className={styles["lb-counter"]}>
            {lbIndex + 1} / {lbImages.length}
          </span>
        </div>
      )}

      {notification && (
        <div className={`${styles["notification"]} ${styles[`notification-${notification.type}`]}`}>
          <div className={styles["notification-content"]}>
            {notification.type === "success" ? "✓" : "✕"} {notification.message}
          </div>
        </div>
      )}
    </>
  );
}
