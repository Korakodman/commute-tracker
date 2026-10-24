"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MonthlyHistoryItem } from "@/lib/month-history-types";

interface MonthlyHistoryResponse {
  history?: MonthlyHistoryItem[];
  message?: string;
}

export interface UseMonthlyHistoryOptions {
  enabled: boolean;
}

export interface UseMonthlyHistoryResult {
  history: MonthlyHistoryItem[];
  historyLoading: boolean;
  historyError: string;
  clearHistoryError: () => void;
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

export function useMonthlyHistory({
  enabled,
}: UseMonthlyHistoryOptions): UseMonthlyHistoryResult {
  const [history, setHistory] = useState<MonthlyHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const clearHistoryError = useCallback(() => setHistoryError(""), []);

  useEffect(() => {
    if (!enabled) return;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    async function loadHistory() {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const response = await fetch("/api/months/history", {
          signal: controller.signal,
        });
        const payload = await readJson<MonthlyHistoryResponse>(response);

        if (!response.ok || !payload?.history) {
          throw new Error(
            payload?.message ?? "โหลดประวัติรายเดือนไม่สำเร็จ"
          );
        }

        if (requestId !== requestIdRef.current) return;

        setHistory(payload.history);
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        setHistory([]);
        setHistoryError(
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการโหลดประวัติรายเดือน"
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setHistoryLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      requestIdRef.current += 1;
      controller.abort();
      setHistoryLoading(false);
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [enabled]);

  return { history, historyLoading, historyError, clearHistoryError };
}
