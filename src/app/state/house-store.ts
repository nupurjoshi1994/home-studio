import { computed, Injectable, signal } from '@angular/core';
import { FurnitureCatalogItem } from '../core/models/catalog.model';
import {
  cloneHouse,
  FurnitureInstance,
  House,
  roomCenter,
  Size3,
  Vec2,
} from '../core/models/house.model';
import { createDefaultHouse } from '../data/default-house';

export type ViewMode = '2d' | '3d';

@Injectable({ providedIn: 'root' })
export class HouseStore {
  private readonly houseState = signal<House>(createDefaultHouse());
  private readonly selectedIdState = signal<string | null>(null);
  private readonly viewModeState = signal<ViewMode>('2d');

  readonly house = this.houseState.asReadonly();
  readonly selectedId = this.selectedIdState.asReadonly();
  readonly viewMode = this.viewModeState.asReadonly();

  readonly selectedFurniture = computed(() => {
    const id = this.selectedIdState();
    if (!id) {
      return null;
    }
    return this.houseState().furniture.find((item) => item.id === id) ?? null;
  });

  load(house: House): void {
    this.houseState.set(cloneHouse(house));
    const selected = this.selectedIdState();
    if (selected && !house.furniture.some((item) => item.id === selected)) {
      this.selectedIdState.set(null);
    }
  }

  resetDefault(): void {
    this.houseState.set(createDefaultHouse());
    this.selectedIdState.set(null);
  }

  setViewMode(mode: ViewMode): void {
    this.viewModeState.set(mode);
  }

  select(id: string | null): void {
    this.selectedIdState.set(id);
  }

  addFurniture(item: FurnitureCatalogItem): void {
    const house = this.houseState();
    const room = house.rooms[0];
    const center = room ? roomCenter(room) : { x: 0, y: 0 };
    const instance: FurnitureInstance = {
      id: crypto.randomUUID(),
      catalogId: item.id,
      name: item.name,
      position: center,
      size: { ...item.defaultSize },
      rotationDeg: 0,
    };

    this.houseState.update((current) => ({
      ...current,
      furniture: [...current.furniture, instance],
    }));
    this.selectedIdState.set(instance.id);
  }

  moveFurniture(id: string, position: Vec2): void {
    this.patchFurniture(id, { position: { ...position } });
  }

  patchSelected(patch: {
    name?: string;
    size?: Partial<Size3>;
    rotationDeg?: number;
  }): void {
    const selected = this.selectedFurniture();
    if (!selected) {
      return;
    }

    this.patchFurniture(selected.id, {
      name: patch.name,
      size: patch.size ? { ...selected.size, ...patch.size } : undefined,
      rotationDeg: patch.rotationDeg,
    });
  }

  private patchFurniture(
    id: string,
    patch: Partial<Pick<FurnitureInstance, 'name' | 'position' | 'size' | 'rotationDeg'>>,
  ): void {
    this.houseState.update((house) => ({
      ...house,
      furniture: house.furniture.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              position: patch.position ?? item.position,
              size: patch.size ?? item.size,
            }
          : item,
      ),
    }));
  }
}
