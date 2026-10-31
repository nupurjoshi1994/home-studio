import {
  afterNextRender,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { FloorPlanRenderer } from '../../../renderers/svg/floor-plan-renderer';
import { HouseStore } from '../../../state/house-store';

@Component({
  selector: 'app-floor-plan-2d',
  templateUrl: './floor-plan-2d.html',
  styleUrl: './floor-plan-2d.scss',
})
export class FloorPlan2d implements OnDestroy {
  private readonly store = inject(HouseStore);
  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('plan');
  private renderer: FloorPlanRenderer | null = null;

  constructor() {
    afterNextRender(() => {
      const svg = this.svgRef().nativeElement;
      this.renderer = new FloorPlanRenderer(svg, {
        onSelect: (id) => this.store.select(id),
        onMove: (id, position) => this.store.moveFurniture(id, position),
      });
      this.renderer.sync(this.store.house(), this.store.selectedId());
    });

    effect(() => {
      const house = this.store.house();
      const selectedId = this.store.selectedId();
      this.renderer?.sync(house, selectedId);
    });
  }

  ngOnDestroy(): void {
    this.renderer?.dispose();
  }
}
