import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { migrateLegacyStorageKeys } from "./services/storageMigration";
import App from "./App";
import "./index.css";

migrateLegacyStorageKeys();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
