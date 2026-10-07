const START_VISIBLE_WIDTH = 0.34;
const MAXIMUM_VISIBLE_FRACTION = 0.75;
const MAXIMUM_SCALE = 48;

export function cameraLimits(world, viewport) {
  return {
    min: Math.max(
      viewport.width / (world.width * MAXIMUM_VISIBLE_FRACTION),
      viewport.height / (world.height * MAXIMUM_VISIBLE_FRACTION),
    ),
    max: MAXIMUM_SCALE,
  };
}

export function createSpatialCamera(world, viewport, random = Math.random) {
  const limits = cameraLimits(world, viewport);
  const scale = Math.min(limits.max, Math.max(limits.min, viewport.width / (world.width * START_VISIBLE_WIDTH)));
  const centerX = world.width * (0.18 + random() * 0.64);
  const centerY = world.height * (0.18 + random() * 0.64);
  return {
    x: centerX - viewport.width / (2 * scale),
    y: centerY - viewport.height / (2 * scale),
    scale,
  };
}

export function panCamera(camera, deltaWorldX, deltaWorldY) {
  camera.x += deltaWorldX;
  camera.y += deltaWorldY;
}

export function cameraViewBox(camera, viewport) {
  return {
    x: camera.x,
    y: camera.y,
    width: viewport.width / camera.scale,
    height: viewport.height / camera.scale,
  };
}

export function zoomCamera(camera, world, viewport, point, scale) {
  const limits = cameraLimits(world, viewport);
  const nextScale = Math.max(limits.min, Math.min(limits.max, scale));
  const worldX = camera.x + point.x / camera.scale;
  const worldY = camera.y + point.y / camera.scale;
  camera.x = worldX - point.x / nextScale;
  camera.y = worldY - point.y / nextScale;
  camera.scale = nextScale;
}

export function resizeCamera(camera, world, previousViewport, nextViewport) {
  const centerX = camera.x + previousViewport.width / (2 * camera.scale);
  const centerY = camera.y + previousViewport.height / (2 * camera.scale);
  const limits = cameraLimits(world, nextViewport);
  camera.scale = Math.max(limits.min, Math.min(limits.max, camera.scale));
  camera.x = centerX - nextViewport.width / (2 * camera.scale);
  camera.y = centerY - nextViewport.height / (2 * camera.scale);
}