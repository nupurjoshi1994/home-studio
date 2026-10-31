import { catalogItemById } from '../../data/furniture-catalog';
import { House, Vec2, wallsFromRoom } from '../../core/models/house.model';

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloorPlanRendererHost {
  onSelect(id: string | null): void;
  onMove(id: string, position: Vec2): void;
}

const NS = 'http://www.w3.org/2000/svg';

export class FloorPlanRenderer {
  private readonly svg: SVGSVGElement;
  private readonly host: FloorPlanRendererHost;
  private viewBox: ViewBox = { x: -800, y: -800, w: 7600, h: 5600 };
  private house: House | null = null;
  private selectedId: string | null = null;
  private drag:
    | { id: string; offset: Vec2 }
    | { pan: true; start: Vec2; view: ViewBox }
    | null = null;

  constructor(svg: SVGSVGElement, host: FloorPlanRendererHost) {
    this.svg = svg;
    this.host = host;
    this.svg.setAttribute('xmlns', NS);
    this.applyViewBox();

    this.svg.addEventListener('pointerdown', this.onPointerDown);
    this.svg.addEventListener('pointermove', this.onPointerMove);
    this.svg.addEventListener('pointerup', this.onPointerUp);
    this.svg.addEventListener('pointerleave', this.onPointerUp);
    this.svg.addEventListener('wheel', this.onWheel, { passive: false });
    this.svg.addEventListener('contextmenu', this.onContextMenu);
  }

  dispose(): void {
    this.svg.removeEventListener('pointerdown', this.onPointerDown);
    this.svg.removeEventListener('pointermove', this.onPointerMove);
    this.svg.removeEventListener('pointerup', this.onPointerUp);
    this.svg.removeEventListener('pointerleave', this.onPointerUp);
    this.svg.removeEventListener('wheel', this.onWheel);
    this.svg.removeEventListener('contextmenu', this.onContextMenu);
  }

  sync(house: House, selectedId: string | null): void {
    this.house = house;
    this.selectedId = selectedId;
    this.draw();
  }

  private applyViewBox(): void {
    const { x, y, w, h } = this.viewBox;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }

  private draw(): void {
    const house = this.house;
    this.svg.replaceChildren();
    if (!house) {
      return;
    }

    const root = this.el('g', { class: 'plan-root' });

    for (const room of house.rooms) {
      const floor = this.el('polygon', {
        class: 'floor',
        points: room.floorPolygon.map((p) => `${p.x},${p.y}`).join(' '),
      });
      root.appendChild(floor);

      for (const wall of wallsFromRoom(room)) {
        const line = this.el('line', {
          class: 'wall',
          x1: String(wall.start.x),
          y1: String(wall.start.y),
          x2: String(wall.end.x),
          y2: String(wall.end.y),
          'stroke-width': String(wall.thicknessMm),
        });
        root.appendChild(line);
      }
    }

    for (const item of house.furniture) {
      const group = this.el('g', {
        class: item.id === this.selectedId ? 'furniture selected' : 'furniture',
        'data-id': item.id,
        transform: `translate(${item.position.x} ${item.position.y}) rotate(${item.rotationDeg})`,
      });
      const rect = this.el('rect', {
        x: String(-item.size.w / 2),
        y: String(-item.size.d / 2),
        width: String(item.size.w),
        height: String(item.size.d),
        fill: catalogItemById(item.catalogId)?.color ?? '#888',
      });
      const label = this.el('text', {
        class: 'furniture-label',
        x: '0',
        y: '0',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      label.textContent = item.name;
      group.append(rect, label);
      root.appendChild(group);
    }

    this.svg.appendChild(root);
  }

  private el(tag: string, attrs: Record<string, string>): SVGElement {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
      node.setAttribute(key, value);
    }
    return node;
  }

  private clientToWorld(event: PointerEvent | WheelEvent): Vec2 {
    const rect = this.svg.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    return {
      x: this.viewBox.x + nx * this.viewBox.w,
      y: this.viewBox.y + ny * this.viewBox.h,
    };
  }

  private furnitureIdFromTarget(target: EventTarget | null): string | null {
    if (!(target instanceof Element)) {
      return null;
    }
    const group = target.closest<SVGGElement>('g.furniture');
    return group?.dataset['id'] ?? null;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button === 1 || event.button === 2) {
      event.preventDefault();
      this.drag = {
        pan: true,
        start: { x: event.clientX, y: event.clientY },
        view: { ...this.viewBox },
      };
      this.svg.setPointerCapture(event.pointerId);
      return;
    }

    if (event.button !== 0) {
      return;
    }

    const id = this.furnitureIdFromTarget(event.target);
    this.host.onSelect(id);
    if (!id) {
      return;
    }

    const item = this.house?.furniture.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    const world = this.clientToWorld(event);
    this.drag = {
      id,
      offset: { x: world.x - item.position.x, y: world.y - item.position.y },
    };
    this.svg.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.drag) {
      return;
    }

    if ('pan' in this.drag) {
      const rect = this.svg.getBoundingClientRect();
      const dx = ((event.clientX - this.drag.start.x) / rect.width) * this.drag.view.w;
      const dy = ((event.clientY - this.drag.start.y) / rect.height) * this.drag.view.h;
      this.viewBox = {
        ...this.drag.view,
        x: this.drag.view.x - dx,
        y: this.drag.view.y - dy,
      };
      this.applyViewBox();
      return;
    }

    const world = this.clientToWorld(event);
    this.host.onMove(this.drag.id, {
      x: world.x - this.drag.offset.x,
      y: world.y - this.drag.offset.y,
    });
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.drag = null;
    if (this.svg.hasPointerCapture(event.pointerId)) {
      this.svg.releasePointerCapture(event.pointerId);
    }
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const world = this.clientToWorld(event);
    const factor = event.deltaY > 0 ? 1.1 : 0.9;
    const next = {
      w: this.viewBox.w * factor,
      h: this.viewBox.h * factor,
    };
    this.viewBox = {
      w: next.w,
      h: next.h,
      x: world.x - ((world.x - this.viewBox.x) / this.viewBox.w) * next.w,
      y: world.y - ((world.y - this.viewBox.y) / this.viewBox.h) * next.h,
    };
    this.applyViewBox();
  };
}
