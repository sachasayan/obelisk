import { Box3, Ray, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { constrainRoomOrbit } from './room-camera';

test('orbiting and zooming past the room stop at the interior boundary along the orbit angle', () => {
  const bounds = new Box3(new Vector3(-153, -61, 4), new Vector3(153, 69, 245));
  const target = new Vector3(0, -13, 10);
  const ray = new Ray();

  for (const position of [new Vector3(0, 0, 1000), new Vector3(-500, 100, 150), new Vector3(500, -500, 125)]) {
    const direction = position.clone().sub(target).normalize();
    expect(constrainRoomOrbit(position, target, bounds, ray)).toBe(true);
    expect(bounds.clone().expandByScalar(1e-8).containsPoint(position)).toBe(true);
    expect(position.clone().sub(target).normalize().dot(direction)).toBeCloseTo(1);
  }

  const interior = new Vector3(4, 0, 120);
  expect(constrainRoomOrbit(interior, target, bounds, ray)).toBe(false);
  expect(interior.toArray()).toEqual([4, 0, 120]);
});
