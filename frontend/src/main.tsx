import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import App from "./App.tsx";
import { CartProvider } from "./contexts/cartContext.tsx";
import { AuthProvider } from "./contexts/authContext.tsx";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { HelpProvider } from "./contexts/helpContext.tsx";

const theme = createTheme({
  palette: {
    primary: { main: "#8DC640" }, // vert
    secondary: { main: "#426A5A" },
  },
});

createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={theme}>
    <StrictMode>
      <BrowserRouter>
        <HelpProvider>
          <AuthProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </AuthProvider>
        </HelpProvider>
      </BrowserRouter>
    </StrictMode>
  </ThemeProvider>,
);
