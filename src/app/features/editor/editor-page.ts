import { Component, effect, inject, OnDestroy } from '@angular/core';
import { ProjectDb } from '../../persistence/project-db';
import { HouseStore } from '../../state/house-store';
import { FurnitureLibrary } from './furniture-library/furniture-library';
import { PropertiesPanel } from './properties-panel/properties-panel';
import { Workspace } from './workspace/workspace';

@Component({
  selector: 'app-editor-page',
  imports: [FurnitureLibrary, Workspace, PropertiesPanel],
  templateUrl: './editor-page.html',
  styleUrl: './editor-page.scss',
})
export class EditorPage implements OnDestroy {
  private readonly store = inject(HouseStore);
  private readonly db = inject(ProjectDb);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private ready = false;

  constructor() {
    void this.restore();

    effect(() => {
      const house = this.store.house();
      if (!this.ready) {
        return;
      }
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }
      this.saveTimer = setTimeout(() => {
        void this.db.save(house);
      }, 400);
    });
  }

  ngOnDestroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
  }

  private async restore(): Promise<void> {
    try {
      const saved = await this.db.load();
      if (saved?.rooms?.length) {
        this.store.load(saved);
      }
    } finally {
      this.ready = true;
    }
  }
}
