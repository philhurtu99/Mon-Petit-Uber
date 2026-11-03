import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { red } from "@mui/material/colors";
import "./dateFilter.css";

const OPTIONS = [
  { label: "Tous", value: "all" },
  { label: "24 dernières heures", value: "24h" },
  { label: "7 derniers jours", value: "7d" },
  { label: "15 derniers jours", value: "15d" },
  { label: "30 derniers jours", value: "30d" },
  { label: "3 derniers mois", value: "3m" },
  { label: "6 derniers mois", value: "6m" },
  { label: "12 derniers mois", value: "12m" },
  { label: "Personnalisé", value: "custom" },
];

type DateRange = {
  from: Date;
  to: Date;
} | null;

type Props = {
  onChange: (range: DateRange) => void;
  textColor?: string;
};

/**
 * Composant dropdown permettant de sélectionner un filtre de dates.
 *
 * Offre plusieurs options prédéfinies (24h, 7 jours, 30 jours, etc.)
 * ainsi qu'une plage personnalisée avec date de début et date de fin.
 *
 * @param onChange Fonction appelée lorsque l'utilisateur sélectionne
 * une plage de dates. Retourne un objet contenant :
 * - from : Date de début
 * - to : Date de fin
 * @param textColor Couleur du texte affiché (optionnel, par défaut #333)
 *
 * @returns Un composant React affichant un menu déroulant de filtres de dates
 * et, si sélectionné, une interface pour choisir une plage personnalisée.
 */
export default function DateFilterDropdown({
  onChange,
  textColor = "#333",
}: Props) {
  const [selected, setSelected] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (value: string) => {
    if (value === "custom") {
      setSelected(value);
      setOpen(false);
      return;
    }
    setSelected(value);
    setOpen(false);
    if (value === "all") {
      onChange(null);
      return;
    }
    const now = new Date();
    let from = new Date();
    switch (value) {
      case "24h":
        from.setHours(now.getHours() - 24);
        break;
      case "7d":
        from.setDate(now.getDate() - 7);
        break;
      case "15d":
        from.setDate(now.getDate() - 15);
        break;
      case "30d":
        from.setDate(now.getDate() - 30);
        break;
      case "3m":
        from.setMonth(now.getMonth() - 3);
        break;
      case "6m":
        from.setMonth(now.getMonth() - 6);
        break;
      case "12m":
        from.setFullYear(now.getFullYear() - 1);
        break;
      default:
        break;
    }
    onChange({ from, to: now });
  };

  // Affichage formaté des dates
  const formatDate = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString();
  };

  // Quand on modifie une date personnalisée, on notifie le parent
  useEffect(() => {
    if (selected === "custom" && startDate && endDate) {
      onChange({ from: new Date(startDate), to: new Date(endDate) });
    }
    // eslint-disable-next-line
  }, [startDate, endDate]);

  const selectedLabel =
    OPTIONS.find((opt) => opt.value === selected)?.label || "";

  return (
    <div className="dateFilter_wrapper">
      <div
        className="transactions__search-container"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          position: "relative",
          cursor: "pointer",
          userSelect: "none",
          height: 48,
          margin: 0,
          minWidth: 170,
          boxSizing: "border-box",
        }}
        ref={dropdownRef}
        tabIndex={0}
      >
        <Calendar style={{ marginRight: "8px", color: "#8DC640" }} />
        {selected !== "custom" ? (
          <span
            style={{ flex: 1, color: textColor, fontSize: 15, minWidth: 0 }}
            onClick={() => setOpen((o) => !o)}
          >
            {selectedLabel}
          </span>
        ) : (
          <div
            style={{
              display: "flex",
              flex: 1,
              gap: 8,
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="transactions__search-input"
              style={{
                backgroundColor: "#fff",
                color: "#333",
                minWidth: 0,
                padding: "6px 4px",
                fontSize: 14,
                border: "1px solid #eee",
                borderRadius: 6,
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span style={{ color: textColor, fontWeight: 600 }}>→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="transactions__search-input"
              style={{
                backgroundColor: "#fff",
                color: "#333",
                minWidth: 0,
                padding: "6px 4px",
                fontSize: 14,
                border: "1px solid #eee",
                borderRadius: 6,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        <span
          style={{ display: "flex", alignItems: "center", marginLeft: 8 }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <ChevronDown size={18} style={{ color: "#8DC640" }} />
        </span>
        {open && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              left: 0,
              right: 0,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 4px 16px 0 rgba(0,0,0,0.13)",
              zIndex: 10,
              padding: 8,
              minWidth: 180,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {OPTIONS.map((opt) => (
              <div
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt.value);
                }}
                className={`dateFilter_option ${selected === opt.value ? "selected" : ""}`}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
