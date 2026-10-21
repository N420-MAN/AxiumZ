// Which room a session takes place in. The most specific answer wins:
// the room set on that very session, then the room of the class's weekly slot
// at that day and time, then the class's usual room, then the old free-text room.

export interface RoomRef {
  id: string;
  name: string;
}

export interface RoomSource {
  starts_at: string;
  room: string | null;
  room_id: string | null;
  classes: {
    room_id: string | null;
    class_slots?: { weekday: number; start_time: string; room_id: string | null }[] | null;
  } | null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function resolveRoomId(s: RoomSource): string | null {
  if (s.room_id) return s.room_id;
  const d = new Date(s.starts_at);
  const weekday = ((d.getDay() + 6) % 7) + 1;
  const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const slot = s.classes?.class_slots?.find((x) => x.weekday === weekday && x.start_time.slice(0, 5) === hhmm && x.room_id);
  return slot?.room_id ?? s.classes?.room_id ?? null;
}

/** The room's name for display, or "" when none is known. */
export function resolveRoomName(s: RoomSource, rooms: RoomRef[]): string {
  const id = resolveRoomId(s);
  if (id) {
    const found = rooms.find((r) => r.id === id);
    if (found) return found.name;
  }
  return s.room ?? "";
}
