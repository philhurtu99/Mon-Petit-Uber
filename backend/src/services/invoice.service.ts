import PDFDocument from "pdfkit";

// URL de l'image du logo
const LOGO_URL =
  "https://res.cloudinary.com/dnz7fsota/image/upload/v1777946042/Header_Facture_quv3bw.png";

// Charge le logo en mémoire sous forme de Buffer (ca veut dire qu'il est stocké en mémoire)
async function loadLogoBuffer() {
  try {
    const response = await fetch(LOGO_URL);

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

// Génère un numéro de facture à partir de l'ID de la transaction et de la date d'achat
export function invoiceNumber(transaction: { id: number; purchaseDate: Date }) {
  const year = new Date(transaction.purchaseDate).getFullYear();
  return `FACT-${year}-${String(transaction.id).padStart(6, "0")}`;
}

// Génère un PDF de facture à partir de l'ID de la commande
export async function generateInvoicePDF(
  transaction: any,
  stripeData: any = null,
): Promise<Buffer> {
  const logoBuffer = await loadLogoBuffer();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (logoBuffer) {
      doc.image(logoBuffer, 50, 40, {
        width: 190,
      });
    }

    const currency = stripeData?.currency || "CAD";
    const items = transaction.items.map((item: any) => ({
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      subtotal: item.price * item.quantity,
    }));

    doc.fontSize(22).text("FACTURE", { align: "right" });

    // Force la suite du contenu sous le logo
    doc.y = Math.max(doc.y, 150);

    doc.moveDown();

    doc.fontSize(12).text(`Numero: ${invoiceNumber(transaction)}`);
    doc.text(`Commande: #${transaction.id}`);
    doc.text(
      `Date: ${new Date(transaction.paidAt || transaction.purchaseDate).toLocaleDateString("fr-CA")}`,
    );

    if (stripeData?.invoiceId) {
      doc.text(`Facture Stripe: ${stripeData.invoiceId}`);
    }

    if (stripeData?.paymentIntentId) {
      doc.text(`Paiement Stripe: ${stripeData.paymentIntentId}`);
    }

    doc.moveDown();
    doc.fontSize(12).text("Client");
    doc.moveDown(0.5);
    doc.text(
      `Nom: ${[transaction.user?.firstName, transaction.user?.lastName].filter(Boolean).join(" ") || "Non disponible"}`,
    );
    if (transaction.user?.email) {
      doc.text(`Courriel: ${transaction.user.email}`);
    }
    if (transaction.user?.phone) {
      doc.text(`Téléphone: ${transaction.user.phone}`);
    }
    if (transaction.user?.address) {
      doc.text(`Adresse: ${transaction.user.address}`);
    }

    doc.moveDown();
    doc.text("Articles");
    doc.moveDown();

    const tableLeft = 65;
    const tableWidth = 420;
    const colProduct = tableLeft + 10;
    const colQty = tableLeft + 230;
    const colUnit = tableLeft + 275;
    const colTotal = tableLeft + 345;
    let y = doc.y;

    doc.rect(tableLeft, y, tableWidth, 22).fillAndStroke("#f2f5ee", "#d7e4c7");
    doc.fillColor("#0a1d3f").fontSize(10);
    doc.text("Produit", colProduct, y + 7, { width: 205 });
    doc.text("Qté", colQty, y + 7, { width: 35, align: "center" });
    doc.text("Prix unit.", colUnit, y + 7, { width: 60, align: "right" });
    doc.text("Total", colTotal, y + 7, { width: 65, align: "right" });
    y += 22;

    doc.fillColor("#000").fontSize(10);
    for (const item of items) {
      if (String(item.productName).toLowerCase() === "frais de livraison") {
        continue;
      }

      const rowHeight = Math.max(
        20,
        doc.heightOfString(item.productName, { width: 205 }) + 8,
      );

      doc.rect(tableLeft, y, tableWidth, rowHeight).stroke("#e5e7eb");
      doc.text(item.productName, colProduct, y + 6, { width: 205 });
      doc.text(String(item.quantity), colQty, y + 6, {
        width: 35,
        align: "center",
      });
      doc.text(`${Number(item.unitPrice).toFixed(2)} ${currency}`, colUnit, y + 6, {
        width: 60,
        align: "right",
      });
      doc.text(`${Number(item.subtotal).toFixed(2)} ${currency}`, colTotal, y + 6, {
        width: 65,
        align: "right",
      });
      y += rowHeight;
    }

    doc.rect(tableLeft, y, tableWidth, 22).stroke("#e5e7eb");
    doc.text("Frais de livraison", colProduct, y + 7, { width: 205 });
    doc.text("-", colQty, y + 7, { width: 35, align: "center" });
    doc.text("Gratuit", colTotal, y + 7, { width: 65, align: "right" });
    doc.y = y + 22;

    doc.moveDown();
    doc
      .fontSize(14)
      .text(
        `Total: ${Number(stripeData?.total ?? transaction.total).toFixed(2)} ${currency}`,
        310,
        doc.y,
        { width: 175, align: "right" },
      );

    doc.moveDown();

    if (stripeData?.receiptUrl) {
      doc.fontSize(10).text("Recu Stripe disponible", 65, doc.y, {
        link: stripeData.receiptUrl,
        underline: true,
      });
    }

    doc.moveDown();
    doc.fontSize(10).text("Merci pour votre achat!", 65, doc.y);

    doc.end();
  });
}
