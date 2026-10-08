const START_VISIBLE_WIDTH = 0.3;
const START_VISIBLE_HEIGHT = 0.7;
const MAXIMUM_SCALE = 48;

export function cameraLimits(world, viewport) {
  return {
    min: Math.max(viewport.width / world.width, viewport.height / world.height),
    max: MAXIMUM_SCALE,
  };
}

function clampCamera(camera, world, viewport) {
  const visibleWidth = viewport.width / camera.scale;
  const visibleHeight = viewport.height / camera.scale;
  camera.x = Math.min(Math.max(camera.x, 0), Math.max(0, world.width - visibleWidth));
  camera.y = Math.min(Math.max(camera.y, 0), Math.max(0, world.height - visibleHeight));
}

export function createSpatialCamera(world, viewport, entryPoint = { x: world.width / 2, y: world.height / 2 }) {
  const limits = cameraLimits(world, viewport);
  const scale = Math.min(limits.max, Math.max(
    limits.min,
    viewport.width / (world.width * START_VISIBLE_WIDTH),
    viewport.height / (world.height * START_VISIBLE_HEIGHT),
  ));
  const camera = {
    x: entryPoint.x - viewport.width / (2 * scale),
    y: entryPoint.y - viewport.height / (2 * scale),
    scale,
  };
  clampCamera(camera, world, viewport);
  return camera;
}

export function panCamera(camera, world, viewport, deltaWorldX, deltaWorldY) {
  const previousX = camera.x;
  const previousY = camera.y;
  camera.x += deltaWorldX;
  camera.y += deltaWorldY;
  clampCamera(camera, world, viewport);
  return { x: camera.x - previousX, y: camera.y - previousY };
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
  clampCamera(camera, world, viewport);
}

export function resizeCamera(camera, world, previousViewport, nextViewport) {
  const centerX = camera.x + previousViewport.width / (2 * camera.scale);
  const centerY = camera.y + previousViewport.height / (2 * camera.scale);
  const limits = cameraLimits(world, nextViewport);
  camera.scale = Math.max(limits.min, Math.min(limits.max, camera.scale));
  camera.x = centerX - nextViewport.width / (2 * camera.scale);
  camera.y = centerY - nextViewport.height / (2 * camera.scale);
  clampCamera(camera, world, nextViewport);
}