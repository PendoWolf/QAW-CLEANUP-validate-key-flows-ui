import { useEffect, useState } from "react";
import { api, HttpError, type AppState } from "./api";

type Action = "load" | "increment" | "decrement" | "reset" | "refresh";

// Seam for Pendo. Novus installs the Pendo agent, which provides window.pendo
// at runtime; this fires a `demo-<name>` Track Event (with optional properties).
// No-op when the agent isn't present (local dev), so the app and Playwright
// mocks both stay simple.
function trackEvent(name: Action | "action-failed", props?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    try {
      window.pendo?.track?.(`demo-${name}`, props);
    } catch {
      // Tracking must never break the app or turn a successful action into a failed one.
    }
  }
}

// Track Event properties for each successful action. `previous` is the state the
// visitor saw when the action started; the server's counter is shared by every
// visitor, so it may have changed since.
function actionProps(action: Action, next: AppState, previous: AppState, hadError: boolean) {
  switch (action) {
    case "load":
      return { counter: next.counter, lastAction: next.lastAction };
    case "increment":
    case "decrement":
      return {
        counter: next.counter,
        previousCounter: previous.counter,
        previousLastAction: previous.lastAction,
      };
    case "reset":
      // The result is always 0 / "reset", so only what was wiped out is sent.
      return { previousCounter: previous.counter, previousLastAction: previous.lastAction };
    case "refresh":
      return {
        counter: next.counter,
        lastAction: next.lastAction,
        previousCounter: previous.counter,
        counterChanged: next.counter !== previous.counter,
        recoveredFromError: hadError,
      };
  }
}

// Module scope rather than a ref: React StrictMode mounts App twice in
// development, and the initial load should run (and be tracked) once per page load.
let initialLoadStarted = false;

export default function App() {
  const [state, setState] = useState<AppState>({ counter: 0, lastAction: "none" });
  const [error, setError] = useState<string | null>(null);

  const run = async (name: Action, fn: () => Promise<AppState>) => {
    // Snapshot what the visitor sees now; the response replaces it.
    const previous = state;
    const hadError = error !== null;
    try {
      setError(null);
      const next = await fn();
      setState(next);
      trackEvent(name, actionProps(name, next, previous, hadError));
    } catch (e) {
      const err = e as Error;
      setError(err.message);
      // errorType: TypeError = network/CORS, HttpError = non-2xx, SyntaxError = non-JSON body.
      trackEvent("action-failed", {
        action: name,
        errorType: err.name,
        httpStatus: err instanceof HttpError ? err.status : undefined,
        errorMessage: err.message.slice(0, 100), // keeps props under Pendo's 512-byte limit
      });
    }
  };

  useEffect(() => {
    if (initialLoadStarted) return;
    initialLoadStarted = true;
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
