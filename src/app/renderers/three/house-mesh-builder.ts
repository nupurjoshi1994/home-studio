import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
} from 'three';
import { House, wallsFromRoom } from '../../core/models/house.model';
import { mmToM } from '../../core/units';

export function buildHouseMeshes(house: House): Group {
  const group = new Group();
  group.name = 'house-structure';

  const floorMaterial = new MeshStandardMaterial({
    color: 0xd8cfc4,
    side: DoubleSide,
  });
  const wallMaterial = new MeshStandardMaterial({ color: 0xe8e4dc });

  for (const room of house.rooms) {
    if (room.floorPolygon.length >= 3) {
      const shape = new Shape();
      room.floorPolygon.forEach((point, index) => {
        const x = mmToM(point.x);
        const y = mmToM(point.y);
        if (index === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      });
      const floor = new Mesh(new ShapeGeometry(shape), floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      floor.name = 'floor';
      group.add(floor);
    }

    for (const wall of wallsFromRoom(room)) {
      const x0 = mmToM(wall.start.x);
      const z0 = mmToM(wall.start.y);
      const x1 = mmToM(wall.end.x);
      const z1 = mmToM(wall.end.y);
      const dx = x1 - x0;
      const dz = z1 - z0;
      const length = Math.hypot(dx, dz);
      if (length < 0.001) {
        continue;
      }

      const height = mmToM(wall.heightMm);
      const thickness = mmToM(wall.thicknessMm);
      const mesh = new Mesh(new BoxGeometry(length, height, thickness), wallMaterial);
      mesh.position.set((x0 + x1) / 2, height / 2, (z0 + z1) / 2);
      mesh.rotation.y = -Math.atan2(dz, dx);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = 'wall';
      group.add(mesh);
    }
  }

  return group;
}
