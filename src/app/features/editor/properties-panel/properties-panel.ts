import { Component, inject } from '@angular/core';
import { HouseStore } from '../../../state/house-store';

@Component({
  selector: 'app-properties-panel',
  templateUrl: './properties-panel.html',
  styleUrl: './properties-panel.scss',
})
export class PropertiesPanel {
  readonly store = inject(HouseStore);

  onName(event: Event): void {
    this.store.patchSelected({ name: this.value(event) });
  }

  onSize(field: 'w' | 'd' | 'h', event: Event): void {
    const n = Number(this.value(event));
    if (!Number.isFinite(n) || n <= 0) {
      return;
    }
    this.store.patchSelected({ size: { [field]: n } });
  }

  onRotation(event: Event): void {
    const n = Number(this.value(event));
    if (!Number.isFinite(n)) {
      return;
    }
    this.store.patchSelected({ rotationDeg: n });
  }

  private value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
