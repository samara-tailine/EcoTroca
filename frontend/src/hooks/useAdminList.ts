import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { apiError } from "../services/apiError";

export function useAdminList<T>(load: (signal?: AbortSignal) => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setItems(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted && !axios.isCancel(cause))
          setError(apiError(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load, version]);

  return { items, setItems, loading, error, reload };
}
