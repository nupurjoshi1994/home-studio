import { Injectable } from '@angular/core';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { House, Vec2 } from '../../core/models/house.model';
import { mmToM, mToMm } from '../../core/units';
import { buildFurnitureMeshes } from './furniture-mesh-builder';
import { buildHouseMeshes } from './house-mesh-builder';

export interface ThreeSceneHost {
  onSelect(id: string | null): void;
  onMove(id: string, position: Vec2): void;
}

@Injectable()
export class ThreeSceneService {
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private camera: PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private host: ThreeSceneHost | null = null;
  private houseGroup: Group | null = null;
  private furnitureGroup: Group | null = null;
  private frame = 0;
  private resizeObserver: ResizeObserver | null = null;
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private floorPlane = new Plane(new Vector3(0, 1, 0), 0);
  private drag: { id: string; offset: Vector3 } | null = null;
  private house: House | null = null;
  private selectedId: string | null = null;

  attach(canvas: HTMLCanvasElement, host: ThreeSceneHost): void {
    this.dispose();
    this.canvas = canvas;
    this.host = host;

    const renderer = new WebGLRenderer({ canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer = renderer;

    const scene = new Scene();
    scene.background = new Color(0xb8c4ce);
    this.scene = scene;

    const camera = new PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(8, 7, 8);
    this.camera = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.target.set(3, 0, 2);
    this.controls = controls;

    const ambient = new AmbientLight(0xffffff, 0.7);
    const sun = new DirectionalLight(0xffffff, 1.1);
    sun.position.set(6, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(ambient, sun);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);

    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.controls?.update();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }

  sync(house: House, selectedId: string | null): void {
    if (!this.scene) {
      return;
    }

    const structureChanged = this.structureKey(this.house) !== this.structureKey(house);
    const furnitureChanged =
      this.furnitureKey(this.house) !== this.furnitureKey(house);
    this.house = house;
    this.selectedId = selectedId;

    if (structureChanged) {
      this.replaceGroup(this.houseGroup, buildHouseMeshes(house), (group) => {
        this.houseGroup = group;
      });
    }

    if (furnitureChanged || !this.furnitureGroup) {
      this.replaceGroup(this.furnitureGroup, buildFurnitureMeshes(house.furniture), (group) => {
        this.furnitureGroup = group;
      });
    } else {
      this.updateFurnitureTransforms(house);
    }
    this.applySelectionHighlight();
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerup', this.onPointerUp);
      this.canvas.removeEventListener('pointerleave', this.onPointerUp);
    }

    this.controls?.dispose();
    this.controls = null;

    this.disposeObject(this.houseGroup);
    this.disposeObject(this.furnitureGroup);
    this.houseGroup = null;
    this.furnitureGroup = null;

    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.canvas = null;
    this.host = null;
    this.house = null;
    this.drag = null;
  }

  private furnitureKey(house: House | null): string {
    if (!house) {
      return '';
    }
    return house.furniture
      .map((item) => `${item.id}:${item.catalogId}:${item.size.w}:${item.size.d}:${item.size.h}`)
      .join('|');
  }

  private updateFurnitureTransforms(house: House): void {
    this.furnitureGroup?.children.forEach((child) => {
      if (!(child instanceof Mesh)) {
        return;
      }
      const id = child.userData['furnitureId'] as string | undefined;
      const item = house.furniture.find((entry) => entry.id === id);
      if (!item) {
        return;
      }
      const h = mmToM(item.size.h);
      child.position.set(mmToM(item.position.x), h / 2, mmToM(item.position.y));
      child.rotation.y = -(item.rotationDeg * Math.PI) / 180;
    });
  }

  private structureKey(house: House | null): string {
    if (!house) {
      return '';
    }
    return JSON.stringify(
      house.rooms.map((room) => ({
        polygon: room.floorPolygon,
        h: room.wallHeightMm,
        t: room.wallThicknessMm,
      })),
    );
  }

  private replaceGroup(
    previous: Group | null,
    next: Group,
    assign: (group: Group) => void,
  ): void {
    if (!this.scene) {
      return;
    }
    if (previous) {
      this.scene.remove(previous);
      this.disposeObject(previous);
    }
    this.scene.add(next);
    assign(next);
  }

  private applySelectionHighlight(): void {
    this.furnitureGroup?.traverse((child) => {
      if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
        const selected = child.userData['furnitureId'] === this.selectedId;
        child.material.emissive.setHex(selected ? 0x224466 : 0x000000);
      }
    });
  }

  private disposeObject(object: Object3D | null): void {
    if (!object) {
      return;
    }
    object.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
          material.dispose();
        }
      }
    });
  }

  private resize(): void {
    if (!this.canvas || !this.renderer || !this.camera) {
      return;
    }
    const parent = this.canvas.parentElement ?? this.canvas;
    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private setPointer(event: PointerEvent): void {
    if (!this.canvas) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private hitFurniture(): Mesh | null {
    if (!this.camera || !this.furnitureGroup) {
      return null;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.furnitureGroup.children, false);
    return hits[0]?.object instanceof Mesh ? hits[0].object : null;
  }

  private intersectFloor(): Vector3 | null {
    if (!this.camera) {
      return null;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const point = new Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.floorPlane, point);
    return hit;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.host) {
      return;
    }
    this.setPointer(event);
    const mesh = this.hitFurniture();
    const id = (mesh?.userData['furnitureId'] as string | undefined) ?? null;
    this.host.onSelect(id);
    if (!id || !mesh) {
      return;
    }

    const floorHit = this.intersectFloor();
    if (!floorHit) {
      return;
    }

    this.drag = {
      id,
      offset: new Vector3(mesh.position.x - floorHit.x, 0, mesh.position.z - floorHit.z),
    };
    if (this.controls) {
      this.controls.enabled = false;
    }
    this.canvas?.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.drag || !this.host) {
      return;
    }
    this.setPointer(event);
    const floorHit = this.intersectFloor();
    if (!floorHit) {
      return;
    }
    this.host.onMove(this.drag.id, {
      x: mToMm(floorHit.x + this.drag.offset.x),
      y: mToMm(floorHit.z + this.drag.offset.z),
    });
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.drag = null;
    if (this.controls) {
      this.controls.enabled = true;
    }
    if (this.canvas?.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
  };
}
