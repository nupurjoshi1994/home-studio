import { Component, inject } from '@angular/core';
import { HouseStore, ViewMode } from '../../../state/house-store';
import { FloorPlan2d } from './floor-plan-2d';
import { Scene3d } from './scene-3d';

@Component({
  selector: 'app-workspace',
  imports: [FloorPlan2d, Scene3d],
  templateUrl: './workspace.html',
  styleUrl: './workspace.scss',
})
export class Workspace {
  readonly store = inject(HouseStore);

  setMode(mode: ViewMode): void {
    this.store.setViewMode(mode);
  }
}
