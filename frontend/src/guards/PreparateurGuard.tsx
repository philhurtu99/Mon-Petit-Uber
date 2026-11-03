import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

export default function PreparateurGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, isLoading, user } = useAuth();
  const canPrepare = user?.role === "employe" || user?.role === "admin";

  if (isLoading) return null;

  if (!isLoggedIn || !canPrepare) return <Navigate to="/accueil" replace />;

  return <>{children}</>;
}
