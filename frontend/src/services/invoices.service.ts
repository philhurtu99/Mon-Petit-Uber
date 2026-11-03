import { API_URL } from "../config";

export async function getInvoiceBlobUrl(orderId: number): Promise<string> {
  const response = await fetch(`${API_URL}/api/orders/${orderId}/invoice`, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || "Impossible de récupérer la facture");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function downloadInvoiceFromUrl(url: string, orderId: number): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = `facture-${orderId}.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();
}
