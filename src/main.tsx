import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { migrateLegacyStorageKeys } from "./services/storageMigration";
import "./index.css";

migrateLegacyStorageKeys();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
