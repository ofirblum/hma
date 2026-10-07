import {
  cameraViewBox,
  createSpatialCamera,
  panCamera,
  resizeCamera,
  zoomCamera,
} from '../lib/spatial-camera.mjs';

const FULL_BACKGROUND_SOURCE = '/assets/works/volume-reconstruction.jpg';
const PENPOT_BACKGROUND_CROP = { x: 3083.96, y: 2113.64, width: 1333.328, height: 834.328 };
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

  function getViewport() {
    return { width: surface.clientWidth, height: surface.clientHeight };
  }

  function render() {
    const viewBox = cameraViewBox(camera, viewport);
    worldElement.setAttribute(
      'viewBox',
      `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
    );
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
    panCamera(camera, velocityX * elapsed, velocityY * elapsed);
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
    panCamera(camera, -deltaX / camera.scale, -deltaY / camera.scale);
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
    zoomAt(localPoint(event.clientX, event.clientY), Math.exp(-event.deltaY * 0.001));
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
      panCamera(camera, ...movements[event.key]);
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

  async function initialize() {
    const [svgResponse, worldResponse, assetResponse] = await Promise.all([
      fetch('/assets/portfolio/Board.svg'),
      fetch('/assets/portfolio/penpot-world.json'),
      fetch('/assets/portfolio/asset-index.json'),
    ]);
    if (!svgResponse.ok || !worldResponse.ok || !assetResponse.ok) {
      throw new Error('The native portfolio source files could not be loaded.');
    }

    const [svgText, sourceWorld, assets] = await Promise.all([
      svgResponse.text(),
      worldResponse.json(),
      assetResponse.json(),
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
      const localHref = `/assets/portfolio/native/${encodeURIComponent(asset.extracted_file.split('/').pop())}`;
      image.setAttribute('href', localHref);
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', localHref);
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
    const fullImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    fullImage.setAttribute('x', `${frame.x - PENPOT_BACKGROUND_CROP.x * registrationScale}`);
    fullImage.setAttribute('y', `${frame.y - PENPOT_BACKGROUND_CROP.y * registrationScale}`);
    fullImage.setAttribute('width', `${sourceImage.naturalWidth * registrationScale}`);
    fullImage.setAttribute('height', `${sourceImage.naturalHeight * registrationScale}`);
    fullImage.setAttribute('href', FULL_BACKGROUND_SOURCE);
    fullImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', FULL_BACKGROUND_SOURCE);
    fullImage.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    fullImage.setAttribute('opacity', `${backgroundFill.fillOpacity ?? 1}`);
    backgroundShape.replaceChildren(fullImage);

    world = { width: board.width, height: board.height };
    viewport = getViewport();
    svg.classList.add('portfolio-native-world');
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'visible';
    content.replaceChildren(document.importNode(svg, true));

    worldElement = content.querySelector('.portfolio-native-world');
    camera = createSpatialCamera(world, viewport);
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