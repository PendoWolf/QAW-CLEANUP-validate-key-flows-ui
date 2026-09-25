import { useEffect, useState } from "react";
import { api, type AppState } from "./api";

// Seam for Pendo. Novus installs the Pendo agent, which provides window.pendo
// at runtime; this fires a Track Event for each action. No-op when the agent
// isn't present (local dev), so the app and Playwright mocks both stay simple.
function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    window.pendo?.track?.(`demo-${name}`, properties);
  }
}

export default function App() {
  const [state, setState] = useState<AppState>({ counter: 0, lastAction: "none" });
  const [error, setError] = useState<string | null>(null);

  const run = async (name: string, fn: () => Promise<AppState>) => {
    const prevState = state;
    try {
      setError(null);
      const newState = await fn();
      setState(newState);

      // Build metadata properties tailored to each action
      const properties: Record<string, unknown> =
        name === "reset"
          ? { previous_counter_value: prevState.counter, counter_value: newState.counter }
          : name === "increment" || name === "decrement"
            ? { counter_value: newState.counter, previous_value: prevState.counter, last_action: newState.lastAction }
            : { counter_value: newState.counter, last_action: newState.lastAction };

      trackEvent(name, properties);
    } catch (e) {
      const errorMessage = (e as Error).message;
      setError(errorMessage);

      // Track error event for failed counter actions
      if (typeof window !== "undefined") {
        window.pendo?.track?.("counter_action_error", {
          action_name: name,
          error_message: errorMessage.substring(0, 100),
          counter_value: prevState.counter,
        });
      }
    }
  };

  useEffect(() => {
    run("load", api.getState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "4rem auto", textAlign: "center" }}>
      <h1>QAWolf Demo</h1>

      <p data-testid="counter-value" style={{ fontSize: "3rem", margin: "1rem 0" }}>
        {state.counter}
      </p>
      <p data-testid="last-action" style={{ color: "#666" }}>
        Last action: {state.lastAction}
      </p>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button data-testid="btn-increment" onClick={() => run("increment", api.increment)}>
          Increment
        </button>
        <button data-testid="btn-decrement" onClick={() => run("decrement", api.decrement)}>
          Decrement
        </button>
        <button data-testid="btn-reset" onClick={() => run("reset", api.reset)}>
          Reset
        </button>
        <button data-testid="btn-refresh" onClick={() => run("refresh", api.getState)}>
          Refresh
        </button>
      </div>

      {error && (
        <p data-testid="error" style={{ color: "crimson", marginTop: 16 }}>
          {error}
        </p>
      )}
    </main>
  );
}
