import React, { useEffect, useMemo, useState } from "react";
import "./orders-history.css";
import { CommandeEtat, CommandeType, type Commande, type CommandeHistoryDTO, type DateRange } from "../../models";
import { filtrerOrders, formatCurrency, formatTime, getProductImage, getReadyLabel, ordersService, sortHeaderOrders } from "../../services/ordersService";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Search, Weight } from "lucide-react";
import { DateFilterDropdown } from "../../components";
import { useTableSort } from "./hooks/sort";
import type { PreparationOrder } from "../../services/preparateurService";
import { formatDatePourFiltre } from "../../services/transactionsService";
import { useHelpSystem } from "../../components/helpPage/hooks/useHelpSystem";
export function OrdersHistory() {
  const [finishedOrders, setFinishedOrders] = useState<CommandeHistoryDTO[]>([]);
  const [activeOrders, setActiveOrders] = useState<CommandeHistoryDTO[]>([]);
  const [openedOrder, setOpenedOrder] = useState<number | null>(null);
  // états pour la barre de recherche et le filtre de date
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>(null);

  const sortConfigActives = useTableSort("createdAt");
  const sortConfigFinished = useTableSort("createdAt");

// utiliser le hook pour gérer l'affichage de l'aide contextuelle au survol 
  const { helpProps } = useHelpSystem();

  // récouperer les commandes déjà terminées
  useEffect(() => {
    ordersService
      .getAllFinishedOrders()
      .then((data) => setFinishedOrders(data))
      .catch((err) => console.error("Error:", err));
  }, [finishedOrders]);

  // récouperer les commandes encore actives
  useEffect(() => {
    ordersService
      .fetchAllActiveOrders()
      .then((data) => setActiveOrders(data))
      .catch((err) => console.error("Error:", err));
  }, [activeOrders]);

  // Entête avec la possibilité d'ordre par la colonne choisi (sort)
  const header = (table : any) => (
  <thead>
    <tr  {...helpProps("sorting")}>
      <th className={table.sortConfig.key === "id" ? "active" : ""} onClick={() => table.handleSort("id")}># {table.getSortIcon("id")}</th>
      <th className={table.sortConfig.key === "createdAt" ? "active" : ""} onClick={() => table.handleSort("createdAt")}>Créé le {table.getSortIcon("createdAt")}</th>
      <th className={table.sortConfig.key === "client" ? "active" : ""} onClick={() => table.handleSort("client")}>Client {table.getSortIcon("client")}</th>
      <th className={table.sortConfig.key === "readyForPickupAt" ? "active" : ""} onClick={() => table.handleSort("readyForPickupAt")}>Prêt {table.getSortIcon("readyForPickupAt")}</th>
      <th className={table.sortConfig.key === "etat" ? "active" : ""} onClick={() => table.handleSort("etat")}>État {table.getSortIcon("etat")}</th>
      <th className={table.sortConfig.key === "livreur" ? "active" : ""} onClick={() => table.handleSort("livreur")}>Livreur {table.getSortIcon("livreur")}</th>
      <th className={table.sortConfig.key === "deliveryPickedUpAt" ? "active" : ""} onClick={() => table.handleSort("deliveryPickedUpAt")}>Ramassé {table.getSortIcon("deliveryPickedUpAt")}</th>
      <th className={table.sortConfig.key === "items" ? "active" : ""} onClick={() => table.handleSort("items")}>Items {table.getSortIcon("items")}</th>
      <th className={table.sortConfig.key === "type" ? "active" : ""} onClick={() => table.handleSort("type")}>Type {table.getSortIcon("type")}</th>
      <th className={table.sortConfig.key === "updatedAt" ? "active" : ""} onClick={() =>table.handleSort("updatedAt")}>Dernière MAJ {table.getSortIcon("updatedAt")}</th>
      <th className={table.sortConfig.key === "total" ? "active" : ""} onClick={() => table.handleSort("total")}>Total {table.getSortIcon("total")}</th>
    </tr>
  </thead>
);

const toggleItems = (index: number) => {
  setOpenedOrder((prev) => (prev === index ? null : index));
};

// afficher les produits dans la commande
const renderOrderItems = (order: CommandeHistoryDTO,  isOpened: boolean) => {
  if (!isOpened || !order.items?.length) return null;

  return (
    <tr>
      <td colSpan={12}>
        <div className="orders__items-container">
          <ul className="orders__items">
            {order.items.map((item) => {
              const imgSrc = getProductImage(item.imageUrl);

              return (
                <li className="orders__item" key={item.id}>
                  
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={item.productName ?? "Produit"}
                    />
                  ) : (
                    <div className="orders__item-placeholder" />
                  )}

                  <div>
                    <strong>{item.productName ?? "Produit"}</strong>

                    <span>
                      Qté {item.quantity} ·{" "}
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </td>
    </tr>
  );
};

// Formate une date en affichant uniquement l’heure (HH:MM).
const formatJustTime = (date: string | Date | null | undefined): string => {
  if (!date) return "";

  const d = new Date(date);

  if (isNaN(d.getTime())) return "";

  return d.toLocaleTimeString("fr-CA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// afficher les informations des commandes
const renderOrders = (items: CommandeHistoryDTO[]) => {
  return items.map((order) => (
    <React.Fragment key={order.id}>
      <tr className="orders__table-row">
        <td>{order.id}</td>
        <td>{formatDatePourFiltre(order.createdAt)}</td>
        <td>{order.client?.name || "-"}</td>
        <td>{formatJustTime(order.readyForPickupAt)}</td>
        <td><span className="orders__status">{getReadyLabel(order.type, order.etat)}</span></td>
        <td>{order.livreur?.name || "-"}</td>
        <td>{formatJustTime(order.deliveryPickedUpAt)}</td>

        {/* CLICKABLE ITEMS */}
        <td
          style={{ cursor: "pointer", color: "#007bff" }}
          onClick={() => toggleItems(order.id)}
          {...helpProps("order-items")}
        >
          {order.items?.length || 0}
        </td>
        <td>{order.type == CommandeType.PICKUP ? "Pour ramassage" : "Pour livraison"}</td>
        <td>
          {formatDatePourFiltre(order.updatedAt)}
        </td>
        <td>{formatCurrency(order.total || 0)}</td>
      </tr>

      {/* ITEMS */}
      {renderOrderItems(order, openedOrder === order.id)}
      
    </React.Fragment>
  ));
};

// Filtrer les commandes selon les termes données
const filteredActivesOrders = useMemo(() => {
  return filtrerOrders(activeOrders, searchTerm, dateRange);
}, [activeOrders, searchTerm, dateRange]);

const filteredFinishedOrders = useMemo(() => {
  return filtrerOrders(finishedOrders, searchTerm, dateRange);
}, [finishedOrders, searchTerm, dateRange]);


  return (
    <div className="orders__wrapper">
      <div className="orders__header">
        <div>
          <h1 className="orders__title">
            Historique des commandes
          </h1>

          <p className="orders__subtitle">
            Il y a {activeOrders.length} commandes actives et {finishedOrders.length} commandes terminées
          </p>

        </div>
      </div>

      {/* --- barre de recherche --- */}
      <div className="transactions__search-wrapper row">
        <div className="transactions__search-container col-12 col-md-9">
          <Search style={{ marginRight: "8px", color: "#8DC640" }} />
          <input
            type="text"
            placeholder="Rechercher une commande..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="transactions__search-input"
            {...helpProps("search")}
          />
        </div>
        <div className="col-12 col-md-3" {...helpProps("date-filter")}>
          <DateFilterDropdown onChange={setDateRange}  />
        </div>
      </div>
      
      {/* COMMANDES ACTIVES */}
      <Accordion
        disableGutters
        elevation={0}
        className="orders__accordion"
        {...helpProps("active-orders")}
      >
        <AccordionSummary
          expandIcon={ <ExpandMoreIcon sx={{ color: "#8DC640" }} /> }
          className="orders__accordion-header"
        >
          <div className="orders__accordion-title">
            Commandes actives <span>{filteredActivesOrders.length}</span>
          </div>
        </AccordionSummary>

        <AccordionDetails className="orders__accordion-content">
          <div className="orders__table-wrapper">
            <table className="orders__table">
              {header(sortConfigActives)}

              <tbody>
                {renderOrders(sortHeaderOrders(filteredActivesOrders, sortConfigFinished.sortConfig ))}
              </tbody>
            </table>
          </div>
        </AccordionDetails>
      </Accordion>

      {/* COMMANDES TERMINÉES */}
      <Accordion
        disableGutters
        elevation={0}
        className="orders__accordion"
        {...helpProps("finished-orders")}
      >
        <AccordionSummary
          expandIcon={
            <ExpandMoreIcon sx={{ color: "#8DC640" }} />
          }
          className="orders__accordion-header"
        >
          <div className="orders__accordion-title">
            Commandes terminées <span>{filteredFinishedOrders.length}</span>
          </div>
        </AccordionSummary>

        <AccordionDetails className="orders__accordion-content">
          <div className="orders__table-wrapper">
            <table className="orders__table">
              {header(sortConfigFinished)}

              <tbody>
                {renderOrders(sortHeaderOrders(filteredFinishedOrders, sortConfigFinished.sortConfig))}
              </tbody>
            </table>
          </div>
        </AccordionDetails>
      </Accordion>
    </div>
  );
}