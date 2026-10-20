"use client";

import { useEffect, useState } from "react";
import { subscribeLoading } from "../services/loadingTracker";

// Thin animated bar at the top of the page while any request is in flight
function LoadingBar() {
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeLoading(setLoading), []);

  if (!loading) return null;
  return <div className="loading-bar" role="progressbar" aria-label="Loading" />;
}

export default LoadingBar;
