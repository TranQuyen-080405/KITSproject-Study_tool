// This file mounts the React web client into the HTML root element.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import logoUrl from "../../../assets/icons/logo.png";
import { App } from "./app";

const favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']") ?? document.createElement("link");
favicon.rel = "icon";
favicon.type = "image/png";
favicon.href = logoUrl;
if (!favicon.parentElement) {
  document.head.appendChild(favicon);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
