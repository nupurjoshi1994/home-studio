import { Size3 } from './house.model';

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  defaultSize: Size3;
  color: string;
}
