import { useEffect, useState } from "react";
import styles from "../orderModal/orderModal.module.css";
import reviewStyles from "./employeeReviewFormModal.module.css";
import type { Commande } from "../../models";
import defaultAvatar from "../../assets/default-avatar.png";
import { employeeReviewService } from "../../services/employeeReviewService";
import { API_URL } from "../../config";

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    commande: Commande | null;
    onReviewSubmitted?: () => void;
}

export default function EmployeeReviewModal({
    isOpen,
    onClose,
    commande,
    onReviewSubmitted,
}: ReviewModalProps) {
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setHovered(0);
            setComment("");
            setError(null);
        }
    }, [isOpen]);

    
    if (!isOpen || !commande) {
        return null;
    }

    const livreurAvatar = commande.livreur?.profilePicture
        ? commande.livreur.profilePicture.startsWith("http")
            ? commande.livreur.profilePicture
            : `${API_URL}${commande.livreur.profilePicture}`
        : defaultAvatar;


    const handleSubmit = async () => {
        if (!rating || isSubmitting) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const { status, data } = await employeeReviewService.create(commande.id, {
                rating,
                comment: comment || undefined,
            });
            if (status >= 400) {
                throw new Error(data?.message ?? "Erreur lors de l'enregistrement");
            }
            onReviewSubmitted?.();
            onClose();
        } catch (err: any) {
            setError(err.message ?? "Erreur serveur");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles["modal-overlay"]}>
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

                <div className={styles["modal-body"]}>
                    <h2 className={styles["modal-title"]}>Noter la livraison</h2>
                    <p className={reviewStyles["review-subtitle"]}>
                        Commande #{commande.id}
                    </p>

                    {/* Carte livreur */}
                    {commande.livreur && (
                        <div className={styles["modal-livreur"]}>
                            <img
                                src={livreurAvatar}
                                alt={commande.livreur.firstName}
                                className={styles["modal-livreur-avatar"]}
                            />
                            <div className={styles["modal-livreur-info"]}>
                                <span className={styles["modal-livreur-name"]}>
                                    {commande.livreur.firstName} {commande.livreur.lastName}
                                </span>
                                <span className={styles["modal-livreur-role"]}>
                                    Votre livreur
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Étoiles */}
                    <p className={reviewStyles["review-hint"]}>
                        Quelle note donnez-vous à cette livraison ?
                    </p>
                    <div className={reviewStyles["stars-row"]}>
                        {[1, 2, 3, 4, 5].map((v) => (
                            <span
                                key={v}
                                className={reviewStyles["star"]}
                                data-active={v <= (hovered || rating)}
                                onMouseEnter={() => setHovered(v)}
                                onMouseLeave={() => setHovered(0)}
                                onClick={() => setRating(v)}
                            >
                                ★
                            </span>
                        ))}
                    </div>

                    {/* Commentaire */}
                    <textarea
                        className={reviewStyles["review-textarea"]}
                        placeholder="Laissez un commentaire (optionnel)"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        maxLength={250}
                    />
                    <span style={{ fontSize: "11px", color: "#9ca3af", textAlign: "right", display: "block" }}>
                        {comment.length}/250
                    </span>

                    {error && (
                        <p className={reviewStyles["review-error"]}>{error}</p>
                    )}

                    <button
                        className={styles["modal-cta-btn"]}
                        onClick={handleSubmit}
                        disabled={!rating || isSubmitting}
                        style={{ opacity: !rating || isSubmitting ? 0.4 : 1, cursor: !rating || isSubmitting ? "not-allowed" : "pointer" }}
                    >
                        {isSubmitting ? "Envoi..." : "Envoyer l'avis"}
                    </button>
                </div>
            </div>
        </div>
    );
}
