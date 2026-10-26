/** Estado das pílulas de dia/horário do pastoreio (visão dos anciãos). */
export interface SlotEvent { id: string; slot_label: string | null }

export function slotState(slots: string[], events: SlotEvent[]) {
  const used = slots.filter((s) => events.some((e) => e.slot_label === s));
  const free = slots.filter((s) => !used.includes(s));
  const withSlot = events.filter((e) => e.slot_label && slots.includes(e.slot_label)).length;
  const remaining = Math.max(0, events.length - withSlot);
  return { used, free, total: events.length, remaining, full: remaining === 0 };
}

export function nextEventWithoutSlot<T extends SlotEvent>(slots: string[], events: T[]): T | undefined {
  return events.find((e) => !e.slot_label || !slots.includes(e.slot_label));
}
