export interface Vec2 {
  x: number;
  y: number;
}

export interface Size3 {
  w: number;
  d: number;
  h: number;
}

export interface Room {
  id: string;
  floorPolygon: Vec2[];
  wallHeightMm: number;
  wallThicknessMm: number;
}

export interface FurnitureInstance {
  id: string;
  catalogId: string;
  name: string;
  position: Vec2;
  size: Size3;
  rotationDeg: number;
}

export interface House {
  id: string;
  name: string;
  rooms: Room[];
  furniture: FurnitureInstance[];
}

export interface WallSegment {
  start: Vec2;
  end: Vec2;
  thicknessMm: number;
  heightMm: number;
}

export function cloneHouse(house: House): House {
  return structuredClone(house);
}

export function wallsFromRoom(room: Room): WallSegment[] {
  const points = room.floorPolygon;
  if (points.length < 2) {
    return [];
  }

  const walls: WallSegment[] = [];
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    walls.push({
      start,
      end,
      thicknessMm: room.wallThicknessMm,
      heightMm: room.wallHeightMm,
    });
  }
  return walls;
}

export function roomBounds(room: Room): { min: Vec2; max: Vec2 } {
  const xs = room.floorPolygon.map((p) => p.x);
  const ys = room.floorPolygon.map((p) => p.y);
  return {
    min: { x: Math.min(...xs), y: Math.min(...ys) },
    max: { x: Math.max(...xs), y: Math.max(...ys) },
  };
}

export function roomCenter(room: Room): Vec2 {
  const { min, max } = roomBounds(room);
  return {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
  };
}
