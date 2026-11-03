import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isLoggedIn) return <Navigate to="/accueil" replace />;

  return <>{children}</>;
}
