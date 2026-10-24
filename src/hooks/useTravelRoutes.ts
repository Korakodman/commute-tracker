"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TravelRoute } from "@/lib/route-types";

interface RoutesResponse {
  Routes?: TravelRoute[];
  message?: string;
}

export interface UseTravelRoutesResult {
  routes: TravelRoute[];
  routesByType: Record<TravelRoute["type"], TravelRoute[]>;
  routesLoading: boolean;
  routesError: string;
  loadRoutes: () => Promise<boolean>;
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function useTravelRoutes(): UseTravelRoutesResult {
  const [routes, setRoutes] = useState<TravelRoute[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState("");
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const loadRoutes = useCallback(async function loadRoutes(): Promise<boolean> {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;
    setRoutesLoading(true);
    setRoutesError("");

    try {
      const response = await fetch("/api/routes", {
        signal: controller.signal,
      });
      const payload = await readJson<RoutesResponse>(response);

      if (!response.ok || !payload?.Routes) {
        throw new Error(payload?.message ?? "โหลดรายการ Route ไม่สำเร็จ");
      }

      if (requestId !== requestIdRef.current) return false;

      setRoutes(payload.Routes);
      return true;
    } catch (routeError) {
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return false;
      }

      setRoutesError(
        routeError instanceof Error
          ? routeError.message
          : "เกิดข้อผิดพลาดในการโหลด Route"
      );
      return false;
    } finally {
      if (requestId === requestIdRef.current) {
        setRoutesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRoutes();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestIdRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [loadRoutes]);

  const routesByType = useMemo(
    () => ({
      OUTBOUND: routes.filter((route) => route.type === "OUTBOUND"),
      RETURN: routes.filter((route) => route.type === "RETURN"),
    }),
    [routes]
  );

  return {
    routes,
    routesByType,
    routesLoading,
    routesError,
    loadRoutes,
  };
}
