import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Wraps the <Outlet /> in MonEspaceLayout specifically — not the whole app.
 * If one page (say, the calendar) throws, this catches it and shows a
 * recoverable message inside the main content area only. The sidebar
 * (navigation, notifications, sign out) stays fully alive around it, so the
 * person can navigate to a working page instead of being stuck on a
 * full-screen dead end with their only option being to leave Mon Espace
 * entirely.
 */
export default class MonEspaceErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error("Mon Espace section error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-8 py-16 text-center">
          <h1 className="font-display text-[1.2rem] font-bold text-gray-900">Un problème est survenu sur cette page</h1>
          <p className="mt-2 text-[0.88rem] text-gray-500">
            Le reste de Mon espace fonctionne normalement — utilisez le menu pour continuer, ou réessayez cette page.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-5 rounded-md bg-gradient-to-br from-ink to-ink-soft px-4 py-2 text-[0.85rem] font-medium text-paper"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
