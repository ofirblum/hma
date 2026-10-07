export const currentState = {
  id: 'ardennes',
  sessionKey: 'hma-landing-image',
  sentence: 'The High Mountains Archive extends into the Ardennes forest, where geological and living processes intersect with industrial residues and post-military infrastructures.',
  crops: [
    { id: 'hma-01', desktopPosition: '50% 50%', mobilePosition: '50% 50%' },
    { id: 'hma-02', desktopPosition: '50% 50%', mobilePosition: '50% 50%' },
    { id: 'hma-03', desktopPosition: '50% 50%', mobilePosition: '50% 50%' },
    { id: 'hma-04', desktopPosition: '50% 50%', mobilePosition: '50% 50%' },
  ],
};

export const practical = {
  email: '',
  portfolio: '/assets/documents/Olivia_Joret_Portfolio_2026.pdf',
};

export const works = [
  {
    id: 'tiny',
    title: 'TINY INFILTRATION',
    titleLines: ['TINY', 'INFILTRATION'],
    entry: 'TINY INFILTRATION',
    still: 'tiny-infiltration-still',
    masterExtension: 'png',
    alt: 'Concentric ridges inside a dark water pipe, a still from Tiny Infiltration.',
    metadata: 'Film, ~2 min, 2026',
    description: 'Tiny Infiltration follows the sound of water entering a hollowed-out high-security storage complex in the forest.',
    context: 'Developed for MOVING ASSEMBLY, a four-hour performance with Level Five at KOMPLOT, Brussels, November 2026, in which works move between storage, display and activation.',
    excerpt: null,
  },
  {
    id: 'chasse',
    title: 'LA CHASSE',
    titleLines: ['LA CHASSE'],
    entry: 'LA CHASSE',
    still: 'la-chasse-still',
    masterExtension: 'png',
    alt: 'Dense green undergrowth and tree trunks in the forest, a still from La Chasse.',
    subtitle: '(Field notes on a missing film)',
    metadata: 'Film, 2\u201913\u2019\u2019, 2026',
    description: 'La Chasse engages with references to a film with the same name (1950-1960), attributed to A. Cauvin, whose origin and status remain uncertain. The work displaces these references across forest and interior spaces, treating sites as constructed and unstable. Taking its cue from the title, it unsettles the logic of the hunt as a structure of pursuit and capture, while speculating on a form of objectivity that cannot be secured.',
    context: 'Presented in Level Five\u2019s HomeScreen programme during Open Studio Days, Brussels, 2026.',
    excerpt: '/assets/works/la-chasse-loop.mp4',
  },
  {
    id: 'reconstruction',
    title: 'METABOLIC SUBLIME',
    titleLines: ['METABOLIC SUBLIME'],
    entry: 'VOLUME RECONSTRUCTION',
    still: 'volume-reconstruction',
    masterExtension: 'jpg',
    alt: 'Complete volume reconstruction: black technical drawings of the bunker volumes over a pink photograph of its hollowed-out interior.',
    metadata: 'Volume reconstruction',
    description: 'The inaccessible interior volumes of a hollowed-out post-military bunker complex in the forest are apprehended through partial information. Processes of sensing through form, scale, material and activation bring these volumes into an affective and bodily relation, allowing some of their loads (historical, political, economic, ecological and others) to be approached and partially processed.',
    excerpt: null,
  },
];

export function selectCrop(storage, random = Math.random) {
  let selected;
  try { selected = storage?.getItem(currentState.sessionKey); } catch {}
  let crop = currentState.crops.find((candidate) => candidate.id === selected);
  if (!crop) {
    crop = currentState.crops[Math.floor(random() * currentState.crops.length)];
    try { storage?.setItem(currentState.sessionKey, crop.id); } catch {}
  }
  return crop;
}