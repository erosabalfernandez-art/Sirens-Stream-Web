import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#07070f",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Algo salió mal</h1>
          <p style={{ color: "#aaa", marginBottom: "1.5rem", maxWidth: "400px" }}>
            Hubo un error al cargar la página. Por favor recarga e intenta de nuevo.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 2rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Recargar página
          </button>
          <details style={{ marginTop: "2rem", color: "#555", maxWidth: "600px", textAlign: "left" }}>
            <summary style={{ cursor: "pointer", color: "#666" }}>Detalles del error</summary>
            <pre style={{ fontSize: "0.75rem", marginTop: "0.5rem", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {this.state.error.message}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
