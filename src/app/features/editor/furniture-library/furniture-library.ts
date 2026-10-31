import { Component, inject } from '@angular/core';
import { FURNITURE_CATALOG } from '../../../data/furniture-catalog';
import { HouseStore } from '../../../state/house-store';

@Component({
  selector: 'app-furniture-library',
  templateUrl: './furniture-library.html',
  styleUrl: './furniture-library.scss',
})
export class FurnitureLibrary {
  private readonly store = inject(HouseStore);
  readonly catalog = FURNITURE_CATALOG;

  add(id: string): void {
    const item = this.catalog.find((entry) => entry.id === id);
    if (item) {
      this.store.addFurniture(item);
    }
  }
}
