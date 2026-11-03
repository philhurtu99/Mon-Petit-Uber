import { useState } from "react";
import { productReviewService } from "../../services/productReviewService";
import styles from "./ProductReviewFormModal.module.css";
import { API_URL } from "../../config";


interface ReviewFormModalProps {
  productId: number;
  productName: string;
  existingReview: { id: number; rating: number; comment: string | null; imagesUrl: string[] } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewFormModal({ productId, productName, existingReview, onClose, onSuccess }: ReviewFormModalProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(existingReview?.imagesUrl ?? []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const remaining = 3 - existingImages.length;
    if (remaining <= 0) {
      e.target.value = "";
      return;
    }
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    setImages(files);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Veuillez sélectionner une note");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("rating", String(rating));
      formData.append("comment", comment);

      images.forEach((file) => {
        formData.append("images", file);
      });

      if (existingReview) {

        existingImages.forEach((url) => {
          formData.append("keepImages", url);
        });

        const { status, data } = await productReviewService.update(existingReview.id, formData);
        if (status !== 200) {
          setError(data.message ?? "Erreur lors de la modification");
          return;
        }
      } else {
        const { status, data } = await productReviewService.create(productId, formData);
        if (status !== 201) {
          setError(data.message ?? "Erreur lors de l'envoi");
          return;
        }
      }
      onSuccess();
    } catch {
      setError("Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>

        <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">
          &times;
        </button>

        <h3 className={styles.title}>
          {existingReview ? "Modifier votre avis" : "Laisser un avis"}
        </h3>
        <p className={styles.productName}>{productName}</p>

        {/* Étoiles */}
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`${styles.star} ${star <= (hovered || rating) ? styles.starActive : ""}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
            >
              ★
            </span>
          ))}
        </div>

        {/* Commentaire */}
        <textarea
          className={styles.textarea}
          placeholder="Votre commentaire (optionnel)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={250}
        />
        <span style={{ fontSize: "11px", color: "#9ca3af", textAlign: "right", display: "block" }}>
          {comment.length}/250
        </span>

        {/* Photos existantes */}
        {existingImages.length > 0 && (
          <div className={styles.imagePreview}>
            {existingImages.map((url, i) => (
              <div key={i} className={styles.previewImgWrapper}>
                <img
                  src={`${API_URL}${url}`}
                  alt={`existing ${i}`}
                  className={styles.previewImg}
                />
                <button
                  className={styles.removeImgBtn}
                  onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Photos */}
        <div className={styles.photosSection}>
          <label className={styles.label}>Photos (optionnel, max 3)</label>
          <input type="file" accept="image/*" multiple onChange={handleImageChange} className={styles.fileInput} disabled={existingImages.length + images.length >= 3} />
          {images.length > 0 && (
            <div className={styles.imagePreview}>
              {images.map((file, i) => (
                <img key={i} src={URL.createObjectURL(file)} alt={`preview ${i}`} className={styles.previewImg} />
              ))}
            </div>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* Boutons */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Annuler
          </button>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
            {loading ? "Envoi..." : "Envoyer"}
          </button>
        </div>

      </div>
    </div>
  );
}
