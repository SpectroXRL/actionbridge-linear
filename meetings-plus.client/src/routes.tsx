import { createBrowserRouter, redirect } from "react-router-dom";
import App from "./App";
import LinearIndex from "./components/linear/LinearIndex";
import { API_BASE_URL } from "./config";

type Connected = {
  connected: boolean;
};

async function linearLoader() {
  const res = await fetch(`${API_BASE_URL}/linear/status`);
  const data: Connected = await res.json();

  if (!data.connected) {
    return redirect("/");
  }

  return data;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/linear",
    element: <LinearIndex />,
    loader: linearLoader,
  },
]);
