import {
  cameraViewBox,
  createSpatialCamera,
  panCamera,
  resizeCamera,
  zoomCamera,
} from '../lib/spatial-camera.mjs';
import { selectCameraEntry } from '../lib/spatial-world.mjs';

const FULL_BACKGROUND_SOURCE = '/assets/works/volume-reconstruction.jpg';
const PENPOT_BACKGROUND_CROP = { x: 3083.96, y: 2113.64, width: 1333.328, height: 834.328 };
const WHEEL_ZOOM_STEP = 1.12;
const WHEEL_ZOOM_STEP_DELTA = Math.log(WHEEL_ZOOM_STEP);
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
  let wheelZoomRemainder = 0;
  let detailImages = [];

  function getViewport() {
    return { width: surface.clientWidth, height: surface.clientHeight };
  }

  // Overviews are swapped for untouched originals only once they would be magnified on screen
  // and lie near the view, so deep zoom never holds every full-resolution source decoded at once.
  function updateImageDetail(viewBox) {
    const pixelsPerUnit = camera.scale * window.devicePixelRatio;
    const near = (bounds, margin) => (
      bounds.x < viewBox.x + viewBox.width * (1 + margin)
      && bounds.x + bounds.width > viewBox.x - viewBox.width * margin
      && bounds.y < viewBox.y + viewBox.height * (1 + margin)
      && bounds.y + bounds.height > viewBox.y - viewBox.height * margin
    );
    for (const detail of detailImages) {
      const magnification = pixelsPerUnit / detail.overviewDensity;
      if (!detail.full && !detail.pending && magnification > 1 && near(detail.bounds, 0.5)) {
        detail.pending = true;
        const original = new Image();
        original.src = detail.originalHref;
        original.decode().catch(() => {}).then(() => {
          detail.pending = false;
          if (camera.scale * window.devicePixelRatio / detail.overviewDensity <= 0.75) return;
          detail.full = true;
          detail.element.setAttribute('href', detail.originalHref);
        });
      } else if (detail.full && (magnification < 0.75 || !near(detail.bounds, 1))) {
        detail.full = false;
        detail.element.setAttribute('href', detail.overviewHref);
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

  function animate(timestamp) {
    const elapsed = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;
    const movement = panCamera(camera, world, viewport, velocityX * elapsed, velocityY * elapsed);
    if (movement.x === 0) velocityX = 0;
    if (movement.y === 0) velocityY = 0;
    const friction = 0.94 ** (elapsed * 60);
    velocityX *= friction;
    velocityY *= friction;
    render();

    if (Math.hypot(velocityX, velocityY) < 9) {
      stopInertia();
      return;
    }
    animationFrame = requestAnimationFrame(animate);
  }

  function startInertia() {
    const samples = gesture?.samples ?? [];
    if (motionQuery.matches || samples.length < 2) return;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const elapsed = (last.time - first.time) / 1000;
    if (elapsed <= 0) return;
    velocityX = -(last.x - first.x) / elapsed / camera.scale;
    velocityY = -(last.y - first.y) / elapsed / camera.scale;
    const speed = Math.hypot(velocityX, velocityY);
    const maximum = 1800;
    if (speed < 55) return;
    if (speed > maximum) {
      velocityX *= maximum / speed;
      velocityY *= maximum / speed;
    }
    lastFrameTime = performance.now();
    animationFrame = requestAnimationFrame(animate);
  }

  function localPoint(clientX, clientY) {
    const bounds = surface.getBoundingClientRect();
    return { x: clientX - bounds.left, y: clientY - bounds.top };
  }

  function beginPan(pointer) {
    gesture = {
      type: 'pan',
      pointerId: pointer.id,
      lastX: pointer.x,
      lastY: pointer.y,
      samples: [{ x: pointer.x, y: pointer.y, time: performance.now() }],
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
    stopInertia();
    surface.setPointerCapture(event.pointerId);
    const pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    pointers.set(event.pointerId, pointer);
    surface.focus({ preventScroll: true });
    if (pointers.size === 1) {
      beginPan(pointer);
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
    const now = performance.now();
    gesture.samples.push({ x: pointer.x, y: pointer.y, time: now });
    while (gesture.samples.length > 2 && now - gesture.samples[0].time > 120) gesture.samples.shift();
    render();
  }

  function finishPointer(event, cancelled = false) {
    if (!pointers.has(event.pointerId)) return;
    if (!cancelled && gesture?.type === 'pan' && gesture.pointerId === event.pointerId) onPointerMove(event);
    pointers.delete(event.pointerId);

    if (pointers.size === 1 && gesture?.type === 'pinch') {
      beginPan([...pointers.values()][0]);
      surface.classList.add('is-dragging');
      return;
    }

    if (pointers.size > 0) return;
    surface.classList.remove('is-dragging');
    if (!cancelled && gesture?.type === 'pan') startInertia();
    gesture = null;
  }

  function zoomAt(point, factor) {
    stopInertia();
    zoomCamera(camera, world, viewport, point, camera.scale * factor);
    render();
  }

  function onWheel(event) {
    event.preventDefault();
    if (!camera) return;
    stopInertia();
    const point = localPoint(event.clientX, event.clientY);
    if (event.ctrlKey) {
      zoomAt(point, Math.exp(-event.deltaY * 0.001));
      return;
    }
    wheelZoomRemainder -= event.deltaY * 0.001;
    const steps = Math.trunc(wheelZoomRemainder / WHEEL_ZOOM_STEP_DELTA);
    if (!steps) return;
    wheelZoomRemainder -= steps * WHEEL_ZOOM_STEP_DELTA;
    zoomAt(point, WHEEL_ZOOM_STEP ** steps);
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
      stopInertia();
      panCamera(camera, world, viewport, ...movements[event.key]);
      render();
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomAt({ x: viewport.width / 2, y: viewport.height / 2 }, 1.2);
    } else if (event.key === '-') {
      event.preventDefault();
      zoomAt({ x: viewport.width / 2, y: viewport.height / 2 }, 1 / 1.2);
    } else if (event.key === 'Escape') {
      window.location.assign('/');
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
    const [svgResponse, worldResponse, assetResponse, overviewResponse] = await Promise.all([
      fetch('/assets/portfolio/Board.svg'),
      fetch('/assets/portfolio/penpot-world.json'),
      fetch('/assets/portfolio/asset-index.json'),
      fetch('/assets/portfolio/native-overview.json'),
    ]);
    if (!svgResponse.ok || !worldResponse.ok || !assetResponse.ok || !overviewResponse.ok) {
      throw new Error('The native portfolio source files could not be loaded.');
    }

    const [svgText, sourceWorld, assets, overviews] = await Promise.all([
      svgResponse.text(),
      worldResponse.json(),
      assetResponse.json(),
      overviewResponse.json(),
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
      const localHref = `/assets/portfolio/native/${encodeURIComponent(filename)}`;
      const overview = overviews[filename];
      const servedHref = overview ? `/assets/portfolio/native-overview/${encodeURIComponent(filename)}` : localHref;
      image.setAttribute('href', servedHref);
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
    const backgroundFill = background.fills.find((fill) => fill.fillImage);
    if (!backgroundShape || !backgroundFill) throw new Error('The Penpot background image object is unavailable.');
    const sourceImage = new Image();
    sourceImage.src = FULL_BACKGROUND_SOURCE;
    await sourceImage.decode();
    const frame = {
      x: background.x - board.x,
      y: background.y - board.y,
      width: background.width,
      height: background.height,
    };
    const registrationScale = (
      PENPOT_BACKGROUND_CROP.width * frame.width
      + PENPOT_BACKGROUND_CROP.height * frame.height
    ) / (
      PENPOT_BACKGROUND_CROP.width ** 2
      + PENPOT_BACKGROUND_CROP.height ** 2
    );
    // Only a small part of the registered source lies inside A1. Painting the whole
    // 18 MP image forces Chrome to re-decode it while panning, so keep only the source
    // pixels that A1 can show (plus a one-pixel sampling margin) at their exact position.
    const imageX = frame.x - PENPOT_BACKGROUND_CROP.x * registrationScale;
    const imageY = frame.y - PENPOT_BACKGROUND_CROP.y * registrationScale;
    const left = Math.max(0, Math.floor(-imageX / registrationScale) - 1);
    const top = Math.max(0, Math.floor(-imageY / registrationScale) - 1);
    const right = Math.min(sourceImage.naturalWidth, Math.ceil((board.width - imageX) / registrationScale) + 1);
    const bottom = Math.min(sourceImage.naturalHeight, Math.ceil((board.height - imageY) / registrationScale) + 1);
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = right - left;
    cropCanvas.height = bottom - top;
    cropCanvas.getContext('2d').drawImage(
      sourceImage, left, top, cropCanvas.width, cropCanvas.height, 0, 0, cropCanvas.width, cropCanvas.height,
    );
    const croppedBlob = await new Promise((resolve) => cropCanvas.toBlob(resolve, 'image/png'));
    const croppedSource = URL.createObjectURL(croppedBlob);
    const fullImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    fullImage.setAttribute('x', `${imageX + left * registrationScale}`);
    fullImage.setAttribute('y', `${imageY + top * registrationScale}`);
    fullImage.setAttribute('width', `${cropCanvas.width * registrationScale}`);
    fullImage.setAttribute('height', `${cropCanvas.height * registrationScale}`);
    fullImage.setAttribute('href', croppedSource);
    fullImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', croppedSource);
    fullImage.setAttribute('preserveAspectRatio', 'none');
    fullImage.setAttribute('opacity', `${backgroundFill.fillOpacity ?? 1}`);
    backgroundShape.replaceChildren(fullImage);
    if (MAP_HB_EDGE.enabled) applyMapHBEdge(svg);

    world = { width: board.width, height: board.height };
    viewport = getViewport();
    svg.classList.add('portfolio-native-world');
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'hidden';
    content.replaceChildren(document.importNode(svg, true));

    worldElement = content.querySelector('.portfolio-native-world');
    const rootMatrix = worldElement.getScreenCTM().inverse();
    detailImages = [...worldElement.querySelectorAll('image[data-original-href]')].map((element) => {
      const pattern = element.closest('pattern');
      const shape = worldElement.querySelector(`[fill="url(#${pattern.id})"]`);
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
        originalHref: element.dataset.originalHref,
        overviewHref: element.getAttribute('href'),
        overviewDensity: Number(element.dataset.overviewDensity),
        full: false,
        pending: false,
      };
    });
    camera = createSpatialCamera(world, viewport, selectCameraEntry());
    render();
    surface.focus({ preventScroll: true });
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
    stopInertia();
    render();
  });
  resizeObserver.observe(surface);
  window.addEventListener('blur', stopInertia);
}