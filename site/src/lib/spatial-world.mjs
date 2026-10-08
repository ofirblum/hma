export const cameraEntryPoints = [
	{ id: 'forest-lead', x: 800, y: 700 },
	{ id: 'runway-plane', x: 1240, y: 250 },
	{ id: 'hb-map', x: 2525, y: 480 },
	{ id: 'tiny-circles', x: 2300, y: 1000 },
	{ id: 'elephant-glass', x: 400, y: 750 },
	{ id: 'compacities', x: 780, y: 1770 },
	{ id: 'bunker-material', x: 2700, y: 1650 },
	{ id: 'audiotour-documents', x: 1670, y: 1530 },
];

export function selectCameraEntry(random = Math.random) {
	return cameraEntryPoints[Math.floor(random() * cameraEntryPoints.length)];
}
