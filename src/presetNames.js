export const PRESET_NAMES = [
  'Velara',
  'Nexis',
  'Korax',
  'Rigel',
  'Talar',
  'Orvus',
  'Lumis',
  'Vexil',
  'Miral',
  'Tarok',
  'Selva',
  'Pralix',
  'Zephon',
  'Lorix',
  'Celix',
  'Vantor',
  'Raxus',
  'Proxus',
  'Altara',
  'Cygna',
  'Denox',
  'Bajra',
  'Ferix',
  'Romua',
  'Klinn',
  'Vulci',
  'Syrax',
  'Opari',
  'Tenel',
  'Zorak',
  'Malix',
  'Teren',
  'Luxar',
  'Nyxos',
  'Paxus',
  'Quor',
  'Rhena',
  'Solix',
  'Tyvan',
  'Ulmar',
  'Vorax',
  'Xelar',
  'Ydris',
  'Zaren',
  'Telar',
  'Andor',
  'Bolix',
  'Trill',
  'Carda',
  'Argen',
  'Daxil',
  'Eriad',
  'Felle',
  'Graza',
  'Horus',
  'Ilium',
  'Jaxon',
  'Kaela',
  'Lyris',
  'Moxen',
  'Novan',
  'Orell',
  'Prima',
  'Quant',
  'Riven',
  'Stell',
  'Tiber',
  'Ulnor',
  'Vesta',
  'Wexar',
  'Xylon',
  'Yotta',
  'Zelva',
];

export function takePresetName(usedNames = new Set()) {
  const used = new Set(usedNames);
  const available = PRESET_NAMES.filter((name) => !used.has(name));
  const pool = available.length ? available : PRESET_NAMES;
  const base = pool[Math.floor(Math.random() * pool.length)];

  if (!used.has(base)) return base;

  for (let i = 2; i < 100; i++) {
    const candidate = `${base}${i}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}${Date.now().toString(36).slice(-3)}`;
}
