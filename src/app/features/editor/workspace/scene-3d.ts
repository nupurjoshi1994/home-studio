import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { ThreeSceneService } from '../../../renderers/three/three-scene.service';
import { HouseStore } from '../../../state/house-store';

@Component({
  selector: 'app-scene-3d',
  templateUrl: './scene-3d.html',
  styleUrl: './scene-3d.scss',
  providers: [ThreeSceneService],
})
export class Scene3d implements OnDestroy {
  private readonly store = inject(HouseStore);
  private readonly scene = inject(ThreeSceneService);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('viewport');

  constructor() {
    afterNextRender(() => {
      this.scene.attach(this.canvasRef().nativeElement, {
        onSelect: (id) => this.store.select(id),
        onMove: (id, position) => this.store.moveFurniture(id, position),
      });
      this.scene.sync(this.store.house(), this.store.selectedId());
    });

    effect(() => {
      const house = this.store.house();
      const selectedId = this.store.selectedId();
      this.scene.sync(house, selectedId);
    });
  }

  ngOnDestroy(): void {
    this.scene.dispose();
  }
}
