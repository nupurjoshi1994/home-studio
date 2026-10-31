import { House } from '../core/models/house.model';

export function createDefaultHouse(): House {
  return {
    id: crypto.randomUUID(),
    name: 'Studio apartment',
    rooms: [
      {
        id: crypto.randomUUID(),
        floorPolygon: [
          { x: 0, y: 0 },
          { x: 6000, y: 0 },
          { x: 6000, y: 4000 },
          { x: 0, y: 4000 },
        ],
        wallHeightMm: 2700,
        wallThicknessMm: 150,
      },
    ],
    furniture: [],
  };
}
