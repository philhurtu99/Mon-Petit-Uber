import { useEffect, useState } from "react";
import RegisterModal from "./RegisterModal";
import LoginModal from "./LoginModal";
import ForgotPasswordModal from "./forgotPasswordModal";
import ResetPasswordModal from "./resetPasswordModal";
import TwoFactorModal from "./TwoFactorModal";

interface AuthManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export default function AuthManager({
  isOpen,
  onClose,
  onOpen,
}: AuthManagerProps) {
  const getInitialToken = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("reset-password") || "";
  };
  
  // Récupère un éventuel retour Google OAuth avec 2FA depuis l'URL
  const getInitialTwoFactor = () => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("twoFactor");
    const method = params.get("method");
    if (userId && (method === "EMAIL" || method === "SMS")) {
      return { userId, method: method as "EMAIL" | "SMS" };
    }
    return null;
  };

  const [resetToken] = useState(getInitialToken);
  const [twoFactorData, setTwoFactorData] = useState(getInitialTwoFactor);
  const [view, setView] = useState<
    "login" | "register" | "forgot" | "reset" | "twoFactor"
  >(() => {
    if (getInitialToken()) return "reset";
    if (getInitialTwoFactor()) return "twoFactor";
    return "login";
  });

  useEffect(() => {
    if (resetToken || twoFactorData) {
      onOpen();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleCloseAndReset = () => {
    onClose();

    setTimeout(() => {
      setView("login");
      setTwoFactorData(null);
    }, 300);
  };
  // Quand le login retourne requiresTwoFactor, on bascule sur le modal 2FA
  const handleTwoFactorRequired = (userId: string, method: "EMAIL" | "SMS") => {
    setTwoFactorData({ userId, method });
    setView("twoFactor");
  };

  if (!isOpen) return null;

  return (
    <>
      {view === "login" && (
        <LoginModal
          isOpen={true}
          onClose={handleCloseAndReset}
          onSwitchToRegister={() => setView("register")}
          onForgotPassword={() => setView("forgot")}
          onTwoFactorRequired={handleTwoFactorRequired}
        />
      )}

      {view === "register" && (
        <RegisterModal
          isOpen={true}
          onClose={handleCloseAndReset}
          onSwitchToLogin={() => setView("login")}
        />
      )}

      {view === "forgot" && (
        <ForgotPasswordModal
          isOpen
          onClose={handleCloseAndReset}
          onBack={() => setView("login")}
        />
      )}

      {view === "reset" && (
        <ResetPasswordModal
          isOpen
          onClose={handleCloseAndReset}
          token={resetToken}
          onSuccess={() => setView("login")}
        />
      )}
      
      {view === "twoFactor" && twoFactorData && (
        <TwoFactorModal
          isOpen
          userId={twoFactorData.userId}
          method={twoFactorData.method}
          onClose={handleCloseAndReset}
        />
      )}
    </>
  );
}
