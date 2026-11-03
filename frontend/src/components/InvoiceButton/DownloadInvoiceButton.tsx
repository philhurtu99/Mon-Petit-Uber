import { useState } from "react";
import { Eye, FileDown, Loader2, X } from "lucide-react";
import {
  downloadInvoiceFromUrl,
  getInvoiceBlobUrl,
} from "../../services/invoices.service";

type Props = {
  orderId: number;
};

export function DownloadInvoiceButton({ orderId }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    setLoadingPreview(true);
    setError(null);

    try {
      const url = await getInvoiceBlobUrl(orderId);
      setPreviewUrl(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de visualiser la facture",
      );
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleDownload() {
    if (!previewUrl) return;
    downloadInvoiceFromUrl(previewUrl, orderId);
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
  }

  return (
    <>
      <div style={{ position: "relative", display: "inline-flex" }}>
        <button
          type="button"
          onClick={handlePreview}
          disabled={loadingPreview}
          title="Visualiser la facture"
          aria-label="Visualiser la facture"
          className="invoice-download-btn"
          style={{
            height: 38,
            padding: "0 12px",
            gap: 8,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 8,
            border: "1px solid rgba(141, 198, 64, 0.45)",
            background: loadingPreview ? "rgba(141, 198, 64, 0.18)" : "#8DC640",
            color: loadingPreview ? "#8DC640" : "#0a1d3f",
            cursor: loadingPreview ? "not-allowed" : "pointer",
            boxShadow: "0 6px 14px rgba(0, 0, 0, 0.18)",
          }}
        >
          {loadingPreview ? (
            <>
              <Loader2 size={18} />
              <span>Chargement...</span>
            </>
          ) : (
            <>
              <span style={{ fontWeight: 700 }}>Facture</span>
              <Eye size={18} />
            </>
          )}
        </button>

        {error && (
          <div
            style={{
              position: "absolute",
              top: 44,
              right: 0,
              width: 240,
              color: "#ff6b6b",
              fontSize: 13,
              textAlign: "right",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {previewUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu de la facture"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "min(1000px, 95vw)",
              height: "90vh",
              background: "#ffffff",
              borderRadius: 8,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                height: 52,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong>Facture</strong>

              <div style={{ display: "inline-flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleDownload}
                  title="Télécharger"
                  aria-label="Télécharger"
                  style={{
                    height: 36,
                    padding: "0 12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 8,
                    border: "1px solid rgba(141, 198, 64, 0.45)",
                    background: "#8DC640",
                    color: "#0a1d3f",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  <FileDown size={18} />
                  Télécharger
                </button>

                <button
                  type="button"
                  onClick={closePreview}
                  title="Fermer"
                  aria-label="Fermer"
                  style={{
                    height: 36,
                    width: 36,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <iframe
              src={previewUrl}
              title="Facture"
              style={{
                flex: 1,
                width: "100%",
                border: "none",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
