// One entry per city ("metro"). The pipeline scripts read METRO from the environment (default: bay-area).
//   METRO=san-diego node scripts/pipeline/01-fetch-osm.mjs
// Bay Area keeps its original file locations; every other metro gets its own folders.

const SHIFTS = {
  day: 'daytime places: breakfast counters, diners, bakeries, donut shops, coffee, delis, sandwich shops, lunch counters, dim sum, taquerias',
  night: 'evening and late-night places: family dinner spots, noodle and dumpling houses, late-night counters, taquerias, dive bars that serve food',
};

export const METROS = {
  'bay-area': {
    label: 'Bay Area',
    counties: ['San Francisco', 'Alameda County', 'Contra Costa County', 'Marin County', 'San Mateo County', 'Santa Clara County', 'Napa County', 'Sonoma County', 'Solano County'],
    subreddits: ['r/AskSF', 'r/sanfrancisco', 'r/bayarea', 'r/oakland', 'r/eastbay', 'r/SanJose', 'r/berkeley'],
    pipelineDir: 'data/pipeline', reviewDir: 'data/review', seeds: 'data/seeds.json',
    anchors: {
      'San Francisco': [37.7749, -122.4194], Oakland: [37.8044, -122.2712], Berkeley: [37.8716, -122.2727], Alameda: [37.7652, -122.2416],
      Richmond: [37.9358, -122.3478], 'Walnut Creek': [37.9101, -122.0652], Concord: [37.978, -122.0311], Livermore: [37.6819, -121.768],
      Pleasanton: [37.6624, -121.8747], Hayward: [37.6688, -122.0808], Fremont: [37.5485, -121.9886], 'San Leandro': [37.7249, -122.1561],
      'San Rafael': [37.9735, -122.5311], 'Mill Valley': [37.906, -122.545], 'Daly City': [37.6879, -122.4702], 'San Mateo': [37.563, -122.3255],
      'Redwood City': [37.4852, -122.2364], 'Half Moon Bay': [37.4636, -122.4286], 'Palo Alto': [37.4419, -122.143], 'Mountain View': [37.3861, -122.0839],
      Sunnyvale: [37.3688, -122.0363], 'Santa Clara': [37.3541, -121.9552], 'San Jose': [37.3382, -121.8863], Milpitas: [37.4323, -121.8996],
      Napa: [38.2975, -122.2869], Sonoma: [38.2919, -122.458], 'Santa Rosa': [38.4405, -122.7141], Petaluma: [38.2324, -122.6367],
      Vallejo: [38.1041, -122.2566], Fairfield: [38.2494, -122.04], 'Los Gatos': [37.2358, -121.9624], Gilroy: [37.0058, -121.5683],
    },
    areas: [
      ['Mission District & Bernal Heights', 'San Francisco'], ['Tenderloin, Little Saigon & Civic Center', 'San Francisco'],
      ['Chinatown & North Beach', 'San Francisco'], ['Richmond District', 'San Francisco'], ['Sunset District & Parkside', 'San Francisco'],
      ['SoMa, Dogpatch & Potrero Hill', 'San Francisco'], ['Excelsior, Outer Mission, Visitacion Valley & Bayview', 'San Francisco'],
      ['Haight, Western Addition, Japantown & Polk', 'San Francisco'], ['Downtown Oakland, Oakland Chinatown & Uptown', 'Oakland'],
      ['Fruitvale, East Oakland & San Leandro', 'Oakland'], ['Temescal, Rockridge & North Oakland', 'Oakland'], ['Berkeley & Albany', 'Berkeley'],
      ['Alameda, Richmond & El Cerrito', 'East Bay'], ['Daly City, South San Francisco & San Mateo', 'Peninsula'],
      ['San Jose (Japantown, East San Jose, downtown)', 'San Jose'], ['Santa Clara, Sunnyvale & Mountain View', 'South Bay'],
    ],
    shifts: SHIFTS,
  },

  'san-diego': {
    label: 'San Diego',
    counties: ['San Diego County'],
    subreddits: ['r/sandiego', 'r/SanDiegan', 'r/FoodSanDiego'],
    pipelineDir: 'data/pipeline/san-diego', reviewDir: 'data/review/san-diego', seeds: 'data/seeds-san-diego.json',
    anchors: {
      'Ocean Beach': [32.7473, -117.2496], 'Point Loma': [32.7313, -117.2304], 'Pacific Beach': [32.7978, -117.2405], 'Mission Beach': [32.7708, -117.2522],
      'La Jolla': [32.8328, -117.2713], 'North Park': [32.7473, -117.1297], 'South Park': [32.7194, -117.1309], 'Golden Hill': [32.7158, -117.1427],
      Hillcrest: [32.7484, -117.1647], Middletown: [32.7363, -117.1736], 'Mission Hills': [32.7517, -117.1878], 'Little Italy': [32.7238, -117.1683],
      Downtown: [32.7157, -117.1611], 'Barrio Logan': [32.6976, -117.1447], 'Logan Heights': [32.7044, -117.1295], 'City Heights': [32.7487, -117.0997],
      'Normal Heights': [32.7643, -117.1145], Kensington: [32.7641, -117.1039], 'Kearny Mesa': [32.8336, -117.1426], Clairemont: [32.8264, -117.2004],
      'Linda Vista': [32.7865, -117.1736], 'Old Town': [32.7542, -117.1965], 'National City': [32.6781, -117.0992], 'Chula Vista': [32.6401, -117.0842],
      'La Mesa': [32.7678, -117.0231], 'El Cajon': [32.7948, -116.9625], Encinitas: [33.0369, -117.292], Oceanside: [33.1959, -117.3795], Escondido: [33.1192, -117.0864],
    },
    areas: [
      ['Ocean Beach & Point Loma', 'San Diego'], ['Pacific Beach & Mission Beach', 'San Diego'],
      ['North Park & University Heights', 'San Diego'], ['South Park & Golden Hill', 'San Diego'],
      ['Hillcrest, Mission Hills & Middletown', 'San Diego'], ['Little Italy, Downtown, East Village & Gaslamp', 'San Diego'],
      ['Barrio Logan, Logan Heights & Sherman Heights', 'San Diego'], ['City Heights, Normal Heights & Kensington', 'San Diego'],
      ['Convoy / Kearny Mesa, Clairemont & Linda Vista', 'San Diego'], ['Old Town, Mission Valley & La Jolla', 'San Diego'],
      ['National City & Chula Vista', 'South Bay'], ['La Mesa & El Cajon', 'East County'],
    ],
    shifts: SHIFTS,
  },
};

export const METRO = process.env.METRO ?? 'bay-area';
export const M = METROS[METRO];
if (!M) throw new Error(`Unknown METRO "${METRO}". Options: ${Object.keys(METROS).join(', ')}`);
