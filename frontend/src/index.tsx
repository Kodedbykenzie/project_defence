import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

// Let the layout extend under iPhone notches/home bars so env(safe-area-inset-*) works.
const viewport = document.querySelector('meta[name="viewport"]') ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "viewport" }));
viewport.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}