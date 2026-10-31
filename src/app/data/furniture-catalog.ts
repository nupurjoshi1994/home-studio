import { FurnitureCatalogItem } from '../core/models/catalog.model';

export const FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  {
    id: 'sofa',
    name: 'Sofa',
    defaultSize: { w: 2200, d: 900, h: 850 },
    color: '#6b8f71',
  },
  {
    id: 'dining-table',
    name: 'Dining table',
    defaultSize: { w: 1600, d: 900, h: 750 },
    color: '#8b5e3c',
  },
  {
    id: 'bed',
    name: 'Bed',
    defaultSize: { w: 2000, d: 1600, h: 500 },
    color: '#4a6fa5',
  },
  {
    id: 'chair',
    name: 'Chair',
    defaultSize: { w: 500, d: 500, h: 900 },
    color: '#c4a35a',
  },
];

export function catalogItemById(id: string): FurnitureCatalogItem | undefined {
  return FURNITURE_CATALOG.find((item) => item.id === id);
}
