import type { Category } from "@/types";

export function flatCategories(cats: Category[]): Category[] {
  const result: Category[] = [];
  const walk = (list: Category[]) => {
    for (const c of list) {
      result.push(c);
      if (c.children) walk(c.children);
    }
  };
  walk(cats);
  return result;
}
