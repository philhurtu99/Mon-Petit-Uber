import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, isLoading, user } = useAuth();

  // Si l'utilisateur n'est pas connecté ou n'est pas un administrateur, rediriger vers la page d'accueil
  if (isLoading) return null;

  if (!isLoggedIn || user?.role !== "admin") return <Navigate to="/" replace />;

  return <>{children}</>;
}
