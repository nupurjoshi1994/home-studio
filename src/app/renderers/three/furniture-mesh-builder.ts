import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial } from 'three';
import { FurnitureInstance } from '../../core/models/house.model';
import { catalogItemById } from '../../data/furniture-catalog';
import { mmToM } from '../../core/units';

export function buildFurnitureMeshes(furniture: FurnitureInstance[]): Group {
  const group = new Group();
  group.name = 'furniture';

  for (const item of furniture) {
    const w = mmToM(item.size.w);
    const h = mmToM(item.size.h);
    const d = mmToM(item.size.d);
    const color = catalogItemById(item.catalogId)?.color ?? '#888888';
    const mesh = new Mesh(
      new BoxGeometry(w, h, d),
      new MeshStandardMaterial({ color: new Color(color) }),
    );
    mesh.position.set(mmToM(item.position.x), h / 2, mmToM(item.position.y));
    mesh.rotation.y = -(item.rotationDeg * Math.PI) / 180;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = item.name;
    mesh.userData['furnitureId'] = item.id;
    group.add(mesh);
  }

  return group;
}
