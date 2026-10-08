import {
  cameraViewBox,
  createSpatialCamera,
  panCamera,
  resizeCamera,
  zoomCamera,
} from '../lib/spatial-camera.mjs';
import { selectCameraEntry } from '../lib/spatial-world.mjs';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
// Zoom per pixel of wheel delta; pinch (ctrlKey) deltas are much smaller per event.
const WHEEL_ZOOM_RATE = 0.0015;
const PINCH_ZOOM_RATE = 0.01;
// Notched mouse wheels glide to their target over this time constant (s) instead of jumping.
const WHEEL_GLIDE = 0.05;
// Throw physics in screen pixels so a throw feels the same at every zoom level.
const THROW_WINDOW = 100;
const THROW_MIN_SPEED = 150;
const THROW_MAX_SPEED = 5000;
const THROW_DECAY = 2.6;
const THROW_STOP_SPEED = 15;
const BACKGROUND_LOADERS = 4;
// Subtle material depth inside the mapHB cutout contour. Disable here or with ?mapHBEdge=off.
const MAP_HB_EDGE = {
  enabled: new URLSearchParams(window.location.search).get('mapHBEdge') !== 'off',
  shapeId: '55d6c4c7-509f-8041-8008-be5a2ba364da',
  depth: 4,
  color: '#1c140d',
  opacity: 0.4,
};
const viewer = document.querySelector('[data-portfolio-viewer]');
const surface = viewer?.querySelector('[data-portfolio-world]');
const content = viewer?.querySelector('[data-portfolio-content]');

if (viewer && surface && content) {
  const pointers = new Map();
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let world;
  let camera;
  let viewport;
  let worldElement;
  let gesture = null;
  let velocityX = 0;
  let velocityY = 0;
  let animationFrame = 0;
  let lastFrameTime = 0;
  let zoomFrame = 0;
  let zoomTarget = 0;
  let zoomPoint = null;
  let zoomLastTime = 0;
  let images = [];
  // Decoded overview/initial images stay referenced so exploration never re-fetches them.
  const imageCache = new Map();

  function getViewport() {
    return { width: surface.clientWidth, height: surface.clientHeight };
  }

  function intersects(bounds, viewBox, margin) {
    return bounds.x < viewBox.x + viewBox.width * (1 + margin)
      && bounds.x + bounds.width > viewBox.x - viewBox.width * margin
      && bounds.y < viewBox.y + viewBox.height * (1 + margin)
      && bounds.y + bounds.height > viewBox.y - viewBox.height * margin;
  }

  function preload(href) {
    let entry = imageCache.get(href);
    if (!entry) {
      const image = new Image();
      image.src = href;
      entry = { image, ready: image.decode().catch(() => {}) };
      imageCache.set(href, entry);
    }
    return entry.ready;
  }

  function showImage(element, href) {
    return new Promise((resolve) => {
      element.addEventListener('load', resolve, { once: true });
      element.addEventListener('error', resolve, { once: true });
      element.setAttribute('href', href);
    });
  }

  function isMagnified(entry) {
    return Boolean(entry.originalHref) && camera.scale * window.devicePixelRatio / entry.overviewDensity > 1;
  }

  async function loadImage(entry) {
    entry.loading = true;
    const full = isMagnified(entry);
    const href = full ? entry.originalHref : entry.baseHref;
    await preload(href);
    await showImage(entry.element, href);
    entry.full = full;
    entry.loaded = true;
  }

  // After the reveal, load the rest of A1 nearest-first relative to wherever the camera is now.
  async function loadRemaining() {
    const next = () => {
      const viewBox = cameraViewBox(camera, viewport);
      const cx = viewBox.x + viewBox.width / 2;
      const cy = viewBox.y + viewBox.height / 2;
      let best = null;
      let bestDistance = Infinity;
      for (const entry of images) {
        if (entry.loading) continue;
        const dx = Math.max(entry.bounds.x - cx, 0, cx - entry.bounds.x - entry.bounds.width);
        const dy = Math.max(entry.bounds.y - cy, 0, cy - entry.bounds.y - entry.bounds.height);
        const distance = Math.hypot(dx, dy);
        if (distance < bestDistance) [best, bestDistance] = [entry, distance];
      }
      return best;
    };
    const worker = async () => {
      for (let entry = next(); entry; entry = next()) await loadImage(entry);
    };
    await Promise.all(Array.from({ length: BACKGROUND_LOADERS }, worker));
  }

  // Overviews are swapped for untouched originals only once they would be magnified on screen
  // and lie near the view, so deep zoom never holds every full-resolution source decoded at once.
  function updateImageDetail(viewBox) {
    const pixelsPerUnit = camera.scale * window.devicePixelRatio;
    for (const detail of images) {
      if (!detail.originalHref || !detail.loaded) continue;
      const magnification = pixelsPerUnit / detail.overviewDensity;
      if (!detail.full && !detail.pending && magnification > 1 && intersects(detail.bounds, viewBox, 0.5)) {
        detail.pending = true;
        const original = new Image();
        original.src = detail.originalHref;
        original.decode().catch(() => {}).then(() => {
          detail.pending = false;
          if (camera.scale * window.devicePixelRatio / detail.overviewDensity <= 0.75) return;
          detail.full = true;
          detail.element.setAttribute('href', detail.originalHref);
        });
      } else if (detail.full && (magnification < 0.75 || !intersects(detail.bounds, viewBox, 1))) {
        detail.full = false;
        detail.element.setAttribute('href', detail.baseHref);
      }
    }
  }

  function render() {
    const viewBox = cameraViewBox(camera, viewport);
    worldElement.setAttribute(
      'viewBox',
      `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
    );
    updateImageDetail(viewBox);
  }

  function stopInertia() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    velocityX = 0;
    velocityY = 0;
  }

  function stopZoomGlide() {
    cancelAnimationFrame(zoomFrame);
    zoomFrame = 0;
  }

  function stopMotion() {
    stopInertia();
    stopZoomGlide();
  }

  // Velocities are screen px/s; the camera moves opposite to the pointer.
  function animate(timestamp) {
    const elapsed = Math.min(Math.max((timestamp - lastFrameTime) / 1000, 0), 0.05);
    lastFrameTime = timestamp;
    const requestedX = velocityX * elapsed / camera.scale;
    const requestedY = velocityY * elapsed / camera.scale;
    const movement = panCamera(camera, world, viewport, requestedX, requestedY);
    if (requestedX !== 0 && movement.x === 0) velocityX = 0;
    if (requestedY !== 0 && movement.y === 0) velocityY = 0;
    const decay = Math.exp(-THROW_DECAY * elapsed);
    velocityX *= decay;
    velocityY *= decay;
    render();

    if (Math.hypot(velocityX, velocityY) < THROW_STOP_SPEED) {
      stopInertia();
      return;
    }
    animationFrame = requestAnimationFrame(animate);
  }

  // Velocity over the last THROW_WINDOW ms before release; a pause before letting go
  // stretches the interval, so a deliberate stop-and-release produces no throw.
  function startInertia(releaseTime) {
    if (motionQuery.matches || !gesture) return;
    const samples = gesture.samples.filter((sample) => releaseTime - sample.time <= THROW_WINDOW);
    if (samples.length < 2) return;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const elapsed = Math.max(releaseTime - first.time, 1000 / 60) / 1000;
    velocityX = -(last.x - first.x) / elapsed;
    velocityY = -(last.y - first.y) / elapsed;
    const speed = Math.hypot(velocityX, velocityY);
    if (speed < THROW_MIN_SPEED) {
      velocityX = 0;
      velocityY = 0;
      return;
    }
    if (speed > THROW_MAX_SPEED) {
      velocityX *= THROW_MAX_SPEED / speed;
      velocityY *= THROW_MAX_SPEED / speed;
    }
    lastFrameTime = performance.now();
    animationFrame = requestAnimationFrame(animate);
  }

  function localPoint(clientX, clientY) {
    const bounds = surface.getBoundingClientRect();
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  }

  function beginPan(pointer, time) {
    gesture = {
      type: 'pan',
      pointerId: pointer.id,
      lastX: pointer.x,
      lastY: pointer.y,
      samples: [{ x: pointer.x, y: pointer.y, time }],
    };
  }

  function beginPinch() {
    const [first, second] = [...pointers.values()];
    const center = localPoint((first.x + second.x) / 2, (first.y + second.y) / 2);
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    gesture = { type: 'pinch', center, distance, scale: camera.scale };
  }

  function onPointerDown(event) {
    if (!camera || pointers.size >= 2) return;
    stopMotion();
    surface.setPointerCapture(event.pointerId);
    const pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, pointer);
    surface.focus({ preventScroll: true });
    if (pointers.size === 1) {
      beginPan(pointer, event.timeStamp);
      surface.classList.add('is-dragging');
    } else {
      beginPinch();
      surface.classList.remove('is-dragging');
    }
  }

  function onPointerMove(event) {
    const pointer = pointers.get(event.pointerId);
    if (!pointer || !gesture) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    if (pointers.size === 2 && gesture.type === 'pinch') {
      const [first, second] = [...pointers.values()];
      const center = localPoint((first.x + second.x) / 2, (first.y + second.y) / 2);
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const scale = gesture.distance ? gesture.scale * distance / gesture.distance : gesture.scale;
      zoomCamera(camera, world, viewport, center, scale);
      render();
      return;
    }

    if (gesture.type !== 'pan' || gesture.pointerId !== event.pointerId) return;
    const deltaX = pointer.x - gesture.lastX;
    const deltaY = pointer.y - gesture.lastY;
    panCamera(camera, world, viewport, -deltaX / camera.scale, -deltaY / camera.scale);
    gesture.lastX = pointer.x;
    gesture.lastY = pointer.y;
    // Coalesced events keep every hardware sample for an accurate release velocity.
    const moves = event.getCoalescedEvents?.() ?? [];
    for (const move of moves.length ? moves : [event]) {
      gesture.samples.push({ x: move.clientX, y: move.clientY, time: move.timeStamp });
    }
    while (gesture.samples.length > 2 && event.timeStamp - gesture.samples[0].time > THROW_WINDOW * 2) {
      gesture.samples.shift();
    }
    render();
  }

  function finishPointer(event, cancelled = false) {
    if (!pointers.has(event.pointerId)) return;
    if (!cancelled && gesture?.type === 'pan' && gesture.pointerId === event.pointerId) onPointerMove(event);
    pointers.delete(event.pointerId);

    if (pointers.size === 1 && gesture?.type === 'pinch') {
      beginPan([...pointers.values()][0], event.timeStamp);
      surface.classList.add('is-dragging');
      return;
    }

    if (pointers.size > 0) return;
    surface.classList.remove('is-dragging');
    if (!cancelled && gesture?.type === 'pan') startInertia(event.timeStamp);
    gesture = null;
  }

  function zoomAt(point, factor) {
    stopMotion();
    zoomCamera(camera, world, viewport, point, camera.scale * factor);
    render();
  }

  function glideZoom(timestamp) {
    const elapsed = Math.max((timestamp - zoomLastTime) / 1000, 0);
    zoomLastTime = timestamp;
    const before = camera.scale;
    const progress = 1 - Math.exp(-elapsed / WHEEL_GLIDE);
    zoomCamera(camera, world, viewport, zoomPoint, before * (zoomTarget / before) ** progress);
    render();
    const remaining = Math.abs(Math.log(zoomTarget / camera.scale));
    if (remaining < 0.002 || (elapsed > 0 && camera.scale === before)) {
      zoomCamera(camera, world, viewport, zoomPoint, zoomTarget);
      render();
      zoomFrame = 0;
      return;
    }
    zoomFrame = requestAnimationFrame(glideZoom);
  }

  function onWheel(event) {
    event.preventDefault();
    if (!camera) return;
    stopInertia();
    const point = localPoint(event.clientX, event.clientY);
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.height : 1;
    const delta = event.deltaY * unit;
    if (event.ctrlKey) {
      zoomAt(point, Math.exp(-delta * PINCH_ZOOM_RATE));
      return;
    }
    const factor = Math.exp(-delta * WHEEL_ZOOM_RATE);
    // Trackpads send many small deltas: apply them directly. Notched wheels glide.
    if (event.deltaMode === 0 && Math.abs(delta) < 40) {
      zoomAt(point, factor);
      return;
    }
    zoomTarget = (zoomFrame ? zoomTarget : camera.scale) * factor;
    zoomPoint = point;
    if (!zoomFrame) {
      zoomLastTime = performance.now();
      zoomFrame = requestAnimationFrame(glideZoom);
    }
  }

  function onKeyDown(event) {
    if (!camera) return;
    const panDistance = 80 / camera.scale;
    const movements = {
      ArrowLeft: [panDistance, 0],
      ArrowRight: [-panDistance, 0],
      ArrowUp: [0, panDistance],
      ArrowDown: [0, -panDistance],
    };
    if (movements[event.key]) {
      event.preventDefault();
      stopMotion();
      panCamera(camera, world, viewport, ...movements[event.key]);
      render();
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomAt({ x: viewport.width / 2, y: viewport.height / 2 }, 1.2);
    } else if (event.key === '-') {
      event.preventDefault();
      zoomAt({ x: viewport.width / 2, y: viewport.height / 2 }, 1 / 1.2);
    } else if (event.key === 'Escape') {
      window.location.assign(import.meta.env.BASE_URL);
    }
  }

  function applyMapHBEdge(svg) {
    const shape = svg.querySelector(`#shape-${MAP_HB_EDGE.shapeId}`);
    if (!shape) return;
    const filterId = 'map-hb-inner-edge';
    // The cutout is drawn at partial opacity, so its alpha is first normalised to a solid
    // silhouette. Edge mask = solid × (1 − blurred solid): zero in the interior, strongest just
    // inside the existing contour. Composited "atop" so the silhouette and alpha stay unchanged.
    shape.insertAdjacentHTML('afterbegin', `
      <filter id="${filterId}" color-interpolation-filters="sRGB">
        <feComponentTransfer in="SourceAlpha" result="solid"><feFuncA type="linear" slope="4"/></feComponentTransfer>
        <feGaussianBlur in="solid" stdDeviation="${MAP_HB_EDGE.depth}" result="spread"/>
        <feComposite in="solid" in2="spread" operator="arithmetic" k1="-1" k2="1" k3="0" k4="0" result="edge"/>
        <feFlood flood-color="${MAP_HB_EDGE.color}" flood-opacity="${MAP_HB_EDGE.opacity}"/>
        <feComposite in2="edge" operator="in" result="shade"/>
        <feComposite in="shade" in2="SourceGraphic" operator="atop"/>
      </filter>`.replace(/>\s+</g, '><'));
    shape.querySelector('.fills')?.setAttribute('filter', `url(#${filterId})`);
  }

  async function initialize() {
    const [svgResponse, worldResponse, assetResponse, overviewResponse, backgroundResponse] = await Promise.all([
      fetch(`${BASE}/assets/portfolio/Board.svg`),
      fetch(`${BASE}/assets/portfolio/penpot-world.json`),
      fetch(`${BASE}/assets/portfolio/asset-index.json`),
      fetch(`${BASE}/assets/portfolio/native-overview.json`),
      fetch(`${BASE}/assets/portfolio/background-a1.json`),
    ]);
    if (![svgResponse, worldResponse, assetResponse, overviewResponse, backgroundResponse].every((response) => response.ok)) {
      throw new Error('The native portfolio source files could not be loaded.');
    }

    const [svgText, sourceWorld, assets, overviews, backgroundPlacement] = await Promise.all([
      svgResponse.text(),
      worldResponse.json(),
      assetResponse.json(),
      overviewResponse.json(),
      backgroundResponse.json(),
    ]);
    const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = parsed.documentElement;
    if (parsed.querySelector('parsererror')) throw new Error('The Penpot SVG could not be parsed.');

    for (const style of svg.querySelectorAll('style')) {
      style.textContent = style.textContent.replace(/@font-face\s*{[^}]*}/g, '');
    }
    for (const text of svg.querySelectorAll('text')) {
      const family = text.style.fontFamily.replace(/["']/g, '').toLowerCase();
      if (family.includes('sometype mono')) text.style.fontFamily = 'monospace';
      else if (family === 'archivo') {
        text.style.fontFamily = Number.parseInt(text.style.fontWeight, 10) >= 700
          ? 'Nimbus Sans, Helvetica Neue, Arial, sans-serif'
          : 'Arial, sans-serif';
      } else if (family === 'arimo' || family === 'sourcesanspro') {
        text.style.fontFamily = 'Arial, sans-serif';
      }
    }

    const mediaById = new Map(assets.map((asset) => [asset.penpot_media_record_id, asset]));
    for (const image of svg.querySelectorAll('image')) {
      const href = image.getAttribute('href') || image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      const mediaId = href?.split('/').pop();
      const asset = mediaById.get(mediaId);
      if (!asset) throw new Error(`No extracted Penpot media matches ${mediaId}.`);
      const filename = asset.extracted_file.split('/').pop();
      const localHref = `${BASE}/assets/portfolio/native/${encodeURIComponent(filename)}`;
      const overview = overviews[filename];
      // Hrefs are held back so the browser fetches the visible images first.
      image.dataset.href = overview ? `${BASE}/assets/portfolio/native-overview/${encodeURIComponent(overview.file)}` : localHref;
      image.removeAttribute('href');
      image.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (overview) {
        image.dataset.originalHref = localHref;
        image.dataset.overviewDensity = `${Math.max(
          overview.width / Number(image.getAttribute('width')),
          overview.height / Number(image.getAttribute('height')),
        )}`;
      }
    }

    const board = sourceWorld.board;
    const background = sourceWorld.background;
    const boardShape = svg.querySelector(`#shape-${board.id}`);
    if (!boardShape || !background) throw new Error('The Penpot source has no Board or continuous background element.');

    for (const clipped of boardShape.querySelectorAll('[clip-path]')) {
      const clipPath = clipped.getAttribute('clip-path');
      if (clipPath.includes(`frame-clip-${board.id}-`)) {
        const clipId = clipPath.match(/#([^)'" ]+)/)?.[1];
        clipped.removeAttribute('clip-path');
        if (clipId) svg.querySelector(`[id="${clipId}"]`)?.remove();
      }
    }
    boardShape.querySelector('.frame-background')?.remove();

    const backgroundShape = svg.querySelector(`#shape-${background.id}`);
    if (!backgroundShape) throw new Error('The Penpot background image object is unavailable.');
    const backgroundImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    for (const key of ['x', 'y', 'width', 'height', 'opacity']) backgroundImage.setAttribute(key, `${backgroundPlacement[key]}`);
    backgroundImage.setAttribute('preserveAspectRatio', 'none');
    backgroundImage.dataset.href = `${BASE}/assets/portfolio/background-a1.webp`;
    backgroundShape.replaceChildren(backgroundImage);
    if (MAP_HB_EDGE.enabled) applyMapHBEdge(svg);

    world = { width: board.width, height: board.height };
    viewport = getViewport();
    svg.classList.add('portfolio-native-world');
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'hidden';
    content.classList.add('is-loading');
    content.replaceChildren(document.importNode(svg, true));

    worldElement = content.querySelector('.portfolio-native-world');
    const rootMatrix = worldElement.getScreenCTM().inverse();
    images = [...worldElement.querySelectorAll('image[data-href]')].map((element) => {
      const pattern = element.closest('pattern');
      const shape = (pattern && worldElement.querySelector(`[fill="url(#${pattern.id})"]`)) || element;
      const box = shape.getBBox();
      const matrix = rootMatrix.multiply(shape.getScreenCTM());
      const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
      const xs = corners.map((point) => point.x);
      const ys = corners.map((point) => point.y);
      return {
        element,
        bounds: {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        },
        baseHref: element.dataset.href,
        originalHref: element.dataset.originalHref,
        overviewDensity: Number(element.dataset.overviewDensity) || 0,
        loading: false,
        loaded: false,
        full: false,
        pending: false,
      };
    });
    camera = createSpatialCamera(world, viewport, selectCameraEntry());
    render();

    // Reveal only once every image in the entry view is decoded and attached, and the
    // display face is ready, so the composition appears whole rather than assembling.
    const entryView = cameraViewBox(camera, viewport);
    await Promise.all([
      document.fonts.load('700 24px "Nimbus Sans"').catch(() => {}),
      ...images.filter((entry) => intersects(entry.bounds, entryView, 0)).map(loadImage),
    ]);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    content.classList.remove('is-loading');
    surface.focus({ preventScroll: true });
    loadRemaining();
  }

  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointermove', onPointerMove);
  surface.addEventListener('pointerup', (event) => finishPointer(event));
  surface.addEventListener('pointercancel', (event) => finishPointer(event, true));
  surface.addEventListener('lostpointercapture', (event) => finishPointer(event, true));
  surface.addEventListener('wheel', onWheel, { passive: false });
  surface.addEventListener('keydown', onKeyDown);
  initialize().catch((error) => console.error('Spatial portfolio initialization failed:', error));

  const resizeObserver = new ResizeObserver(() => {
    if (!camera) return;
    const nextViewport = getViewport();
    if (nextViewport.width === viewport.width && nextViewport.height === viewport.height) return;
    resizeCamera(camera, world, viewport, nextViewport);
    viewport = nextViewport;
    stopMotion();
    render();
  });
  resizeObserver.observe(surface);
  window.addEventListener('blur', stopMotion);
}