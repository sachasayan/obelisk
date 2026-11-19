import { Ray } from 'three';
import type { Box3, Vector3 } from 'three';

export function constrainRoomOrbit(position: Vector3, target: Vector3, bounds: Box3, ray: Ray) {
  if (bounds.containsPoint(position)) return false;

  // The target is inside the room. Intersecting from there gives the wall
  // along the current orbit angle, so direction stays continuous at corners.
  ray.origin.copy(target);
  ray.direction.subVectors(position, target).normalize();
  ray.intersectBox(bounds, position);
  return true;
}
