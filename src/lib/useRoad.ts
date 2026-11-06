import { roadOf, type Road } from "../data/exam";
import { useStore } from "./store";

/** The student's road to their CAT (D87): their chosen year, or the default for when they started. */
export function useRoad(): Road {
  const { state } = useStore();
  return roadOf(state);
}
