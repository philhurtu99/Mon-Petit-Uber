/**
 * Mappe les messages d'erreur du backend aux champs de formulaire
 */
export interface ErrorMapping {
  fieldType: "name" | "price" | "stock" | "sale" | "other";
  message: string;
}

export const mapBackendError = (message: string): ErrorMapping => {
  const lowerMessage = message.toLowerCase();

  // Check for name errors
  if (
    lowerMessage.includes("nom") ||
    lowerMessage.includes("existe déjà") ||
    lowerMessage.includes("invalide")
  ) {
    // If it's about duplication or invalid name
    if (lowerMessage.includes("existe déjà")) {
      return { fieldType: "name", message };
    }
    if (lowerMessage.includes("nom")) {
      return { fieldType: "name", message };
    }
  }

  // Check for price errors
  if (lowerMessage.includes("prix")) {
    return { fieldType: "price", message };
  }

  // Check for stock errors
  if (lowerMessage.includes("stock")) {
    return { fieldType: "stock", message };
  }

  // Check for discount/sale errors
  if (lowerMessage.includes("rabais") || lowerMessage.includes("reduction")) {
    return { fieldType: "sale", message };
  }

  // Default to other
  return { fieldType: "other", message };
};

/**
 * Applique l'erreur au bon setter selon son type
 */
export const applyError = (
  errorMapping: ErrorMapping,
  setNameError: (msg: string) => void,
  setPriceError: (msg: string) => void,
  setStockError: (msg: string) => void,
  setSaleError: (msg: string) => void
) => {
  switch (errorMapping.fieldType) {
    case "name":
      setNameError(errorMapping.message);
      break;
    case "price":
      setPriceError(errorMapping.message);
      break;
    case "stock":
      setStockError(errorMapping.message);
      break;
    case "sale":
      setSaleError(errorMapping.message);
      break;
    default:
      // For "other" errors, we might want to show a toast or general error
      setNameError(errorMapping.message);
      break;
  }
};
