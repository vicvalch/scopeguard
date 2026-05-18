import { registerPmfreakAocAdapters } from "@/lib/aoc/adapters";

let _registered = false;

export function ensurePmfreakAocAdaptersRegistered(): void {
  if (_registered) return;
  registerPmfreakAocAdapters();
  _registered = true;
}
