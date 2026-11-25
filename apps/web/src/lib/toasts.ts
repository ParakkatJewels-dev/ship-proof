/**
 * Small notices that appear in a corner and fade away by themselves. They never block the page or another
 * alert box, so the packer can carry on, for example scanning the next order, while one is showing.
 */
export interface ToastItem {
  id: number;
  tone: "ok" | "info";
  text: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const MAX_SHOWN = 3;

const emit = () => listeners.forEach((l) => l(toasts));

export function pushToast(tone: ToastItem["tone"], text: string): number {
  const id = nextId++;
  toasts = [...toasts, { id, tone, text }].slice(-MAX_SHOWN);
  emit();
  return id;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}
