import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f2a5c",
            color: "#fbf8f2",
            textAlign: "center",
            padding: "2rem",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800 }}>Une erreur est survenue.</h1>
            <p style={{ marginTop: "1rem", opacity: 0.8, fontSize: "0.9rem" }}>
              Merci de réessayer, ou de nous contacter si le problème persiste.
            </p>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              style={{
                marginTop: "1.5rem",
                borderRadius: 999,
                background: "#fbf8f2",
                color: "#0f2a5c",
                border: "none",
                padding: "0.75rem 1.5rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
