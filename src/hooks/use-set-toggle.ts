"use client";

import { useState, useCallback } from "react";

export function useSetToggle<T>(initial: T[] = []) {
  const [set, setSet] = useState<Set<T>>(new Set(initial));

  const toggle = useCallback((item: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }, []);

  const add = useCallback((item: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.add(item);
      return next;
    });
  }, []);

  const remove = useCallback((item: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.delete(item);
      return next;
    });
  }, []);

  const has = useCallback((item: T) => set.has(item), [set]);

  const reset = useCallback((items?: T[]) => {
    setSet(new Set(items));
  }, []);

  return { set, toggle, add, remove, has, reset };
}
