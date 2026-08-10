/**
 * Sample atlas for the Places round-2 browse demos.
 *
 * The demos are about hierarchy and scale, so an account with a handful of
 * real places would not exercise them. This seed expands into ~190 places
 * across 6 continents / 19 countries / 45 cities, with states filled in where
 * a country actually uses them (so the demos also handle the ragged case
 * where some countries skip the state level entirely).
 *
 * Place entry format: `Name|category` with a trailing `|v` when visited.
 */

export interface AtlasSeedCity {
  city: string;
  state?: string;
  lat: number;
  lng: number;
  places: string[];
}

export interface AtlasSeedCountry {
  continent: string;
  country: string;
  countryCode: string;
  cities: AtlasSeedCity[];
}

export const ATLAS_SEED: AtlasSeedCountry[] = [
  {
    continent: "Asia",
    country: "Japan",
    countryCode: "JP",
    cities: [
      {
        city: "Kyoto",
        state: "Kansai",
        lat: 35.0116,
        lng: 135.7681,
        places: [
          "Fushimi Inari Taisha|landmark|v",
          "Nishiki Market|market|v",
          "Arashiyama Bamboo Grove|park|v",
          "Kissa Master|cafe",
          "Gion Nanba|restaurant",
        ],
      },
      {
        city: "Osaka",
        state: "Kansai",
        lat: 34.6937,
        lng: 135.5023,
        places: [
          "Kuromon Ichiba|market|v",
          "Endo Sushi|restaurant|v",
          "Umeda Sky Building|viewpoint",
          "Bar Nayuta|bar",
        ],
      },
      {
        city: "Kinosaki",
        state: "Kansai",
        lat: 35.6235,
        lng: 134.8056,
        places: [
          "Goshono-yu Onsen|landmark",
          "Nishimuraya Honkan|hotel",
          "Kinosaki Crab Kitchen|restaurant",
        ],
      },
      {
        city: "Tokyo",
        state: "Kanto",
        lat: 35.6762,
        lng: 139.6503,
        places: [
          "Shimokitazawa|neighborhood|v",
          "Toyosu Market|market|v",
          "Meiji Jingu|landmark|v",
          "Fuglen Tomigaya|cafe|v",
          "Golden Gai|bar",
          "teamLab Planets|museum",
        ],
      },
      {
        city: "Hakone",
        state: "Kanto",
        lat: 35.2324,
        lng: 139.1069,
        places: ["Lake Ashi|lake", "Hakone Open-Air Museum|museum", "Gora Kadan|hotel"],
      },
      {
        city: "Sapporo",
        state: "Hokkaido",
        lat: 43.0618,
        lng: 141.3545,
        places: ["Nijo Market|market", "Mt Moiwa Ropeway|viewpoint", "Sapporo Ramen Yokocho|restaurant"],
      },
      {
        city: "Furano",
        state: "Hokkaido",
        lat: 43.3421,
        lng: 142.383,
        places: ["Farm Tomita|park", "Blue Pond|lake", "Ningle Terrace|market"],
      },
    ],
  },
  {
    continent: "Asia",
    country: "Thailand",
    countryCode: "TH",
    cities: [
      {
        city: "Bangkok",
        lat: 13.7563,
        lng: 100.5018,
        places: [
          "Wat Arun|landmark|v",
          "Or Tor Kor Market|market|v",
          "Jay Fai|restaurant",
          "Sky Bar Lebua|bar",
        ],
      },
      {
        city: "Chiang Mai",
        lat: 18.7883,
        lng: 98.9853,
        places: [
          "Doi Suthep|viewpoint|v",
          "Sunday Walking Street|market|v",
          "Elephant Nature Park|park",
          "Khao Soi Khun Yai|restaurant|v",
        ],
      },
      {
        city: "Krabi",
        lat: 8.0863,
        lng: 98.9063,
        places: ["Railay Beach|beach", "Tiger Cave Temple|hike", "Hong Islands|beach"],
      },
      {
        city: "Pai",
        lat: 19.3583,
        lng: 98.4383,
        places: ["Pai Canyon|viewpoint", "Mo Paeng Waterfall|waterfall", "Bamboo Bridge|landmark"],
      },
    ],
  },
  {
    continent: "Asia",
    country: "Vietnam",
    countryCode: "VN",
    cities: [
      {
        city: "Hanoi",
        lat: 21.0278,
        lng: 105.8342,
        places: ["Old Quarter|neighborhood|v", "Bun Cha Huong Lien|restaurant|v", "Train Street|landmark"],
      },
      {
        city: "Hoi An",
        lat: 15.8801,
        lng: 108.338,
        places: ["Ancient Town|neighborhood|v", "An Bang Beach|beach", "Banh Mi Phuong|restaurant|v"],
      },
      {
        city: "Ha Giang",
        lat: 22.8233,
        lng: 104.9784,
        places: ["Ma Pi Leng Pass|viewpoint", "Dong Van Market|market", "Nho Que River|lake"],
      },
    ],
  },
  {
    continent: "Asia",
    country: "Indonesia",
    countryCode: "ID",
    cities: [
      {
        city: "Ubud",
        state: "Bali",
        lat: -8.5069,
        lng: 115.2625,
        places: ["Tegallalang Terraces|viewpoint", "Campuhan Ridge Walk|hike", "Locavore|restaurant"],
      },
      {
        city: "Canggu",
        state: "Bali",
        lat: -8.6478,
        lng: 115.1385,
        places: ["Echo Beach|beach", "Crate Cafe|cafe", "Batu Bolong|neighborhood"],
      },
      {
        city: "Labuan Bajo",
        state: "East Nusa Tenggara",
        lat: -8.4964,
        lng: 119.8877,
        places: ["Padar Island|hike", "Pink Beach|beach", "Manta Point|beach"],
      },
    ],
  },
  {
    continent: "Europe",
    country: "Portugal",
    countryCode: "PT",
    cities: [
      {
        city: "Lisbon",
        state: "Lisboa",
        lat: 38.7223,
        lng: -9.1393,
        places: [
          "Alfama|neighborhood|v",
          "Time Out Market|market|v",
          "Miradouro da Senhora do Monte|viewpoint|v",
          "Manteigaria|cafe|v",
          "Park Bar|bar",
        ],
      },
      {
        city: "Sintra",
        state: "Lisboa",
        lat: 38.7979,
        lng: -9.3907,
        places: ["Quinta da Regaleira|landmark|v", "Pena Palace|landmark|v", "Praia da Ursa|beach"],
      },
      {
        city: "Porto",
        state: "Norte",
        lat: 41.1579,
        lng: -8.6291,
        places: ["Livraria Lello|landmark|v", "Cais da Ribeira|neighborhood|v", "Taylor's Cellars|bar"],
      },
      {
        city: "Funchal",
        state: "Madeira",
        lat: 32.6669,
        lng: -16.9241,
        places: ["Levada do Caldeirão Verde|hike", "Pico do Arieiro|viewpoint", "Mercado dos Lavradores|market"],
      },
    ],
  },
  {
    continent: "Europe",
    country: "Italy",
    countryCode: "IT",
    cities: [
      {
        city: "Rome",
        state: "Lazio",
        lat: 41.9028,
        lng: 12.4964,
        places: ["Pantheon|landmark|v", "Testaccio Market|market|v", "Roscioli|restaurant|v", "Villa Borghese|park"],
      },
      {
        city: "Florence",
        state: "Tuscany",
        lat: 43.7696,
        lng: 11.2558,
        places: ["Uffizi Gallery|museum|v", "Piazzale Michelangelo|viewpoint|v", "Mercato Centrale|market"],
      },
      {
        city: "Siena",
        state: "Tuscany",
        lat: 43.3188,
        lng: 11.3308,
        places: ["Piazza del Campo|landmark", "Val d'Orcia Drive|viewpoint", "Osteria Le Logge|restaurant"],
      },
      {
        city: "Positano",
        state: "Campania",
        lat: 40.628,
        lng: 14.4849,
        places: ["Spiaggia Grande|beach|v", "Path of the Gods|hike", "Le Sirenuse Bar|bar"],
      },
      {
        city: "Venice",
        state: "Veneto",
        lat: 45.4408,
        lng: 12.3155,
        places: ["Cannaregio|neighborhood", "Peggy Guggenheim Collection|museum", "Rialto Market|market"],
      },
    ],
  },
  {
    continent: "Europe",
    country: "Iceland",
    countryCode: "IS",
    cities: [
      {
        city: "Reykjavik",
        lat: 64.1466,
        lng: -21.9426,
        places: ["Hallgrimskirkja|landmark", "Sky Lagoon|landmark", "Braud & Co|cafe"],
      },
      {
        city: "Vik",
        lat: 63.4187,
        lng: -19.0061,
        places: ["Reynisfjara|beach", "Dyrholaey|viewpoint", "Fjadrargljufur|hike"],
      },
      {
        city: "Hofn",
        lat: 64.2539,
        lng: -15.2082,
        places: ["Jokulsarlon|lake", "Diamond Beach|beach", "Vestrahorn|viewpoint"],
      },
    ],
  },
  {
    continent: "Europe",
    country: "Spain",
    countryCode: "ES",
    cities: [
      {
        city: "Barcelona",
        state: "Catalonia",
        lat: 41.3874,
        lng: 2.1686,
        places: ["Sagrada Familia|landmark|v", "Bunkers del Carmel|viewpoint|v", "Bar Cañete|restaurant", "El Born|neighborhood|v"],
      },
      {
        city: "Girona",
        state: "Catalonia",
        lat: 41.9794,
        lng: 2.8214,
        places: ["Old Town Walls|landmark", "Rocambolesc|cafe"],
      },
      {
        city: "San Sebastian",
        state: "Basque Country",
        lat: 43.3183,
        lng: -1.9812,
        places: ["La Concha|beach|v", "Bar Nestor|restaurant|v", "Monte Igueldo|viewpoint"],
      },
      {
        city: "Seville",
        state: "Andalusia",
        lat: 37.3891,
        lng: -5.9845,
        places: ["Real Alcazar|landmark", "Triana Market|market", "Plaza de España|landmark"],
      },
    ],
  },
  {
    continent: "Europe",
    country: "Greece",
    countryCode: "GR",
    cities: [
      {
        city: "Athens",
        lat: 37.9838,
        lng: 23.7275,
        places: ["Acropolis|landmark", "Anafiotika|neighborhood", "Varvakios Market|market"],
      },
      {
        city: "Oia",
        state: "Santorini",
        lat: 36.4618,
        lng: 25.3753,
        places: ["Oia Castle Sunset|viewpoint", "Ammoudi Bay|beach", "Vlychada Beach|beach"],
      },
      {
        city: "Naxos",
        state: "Cyclades",
        lat: 37.1036,
        lng: 25.3766,
        places: ["Plaka Beach|beach", "Mount Zas|hike", "Halki Village|neighborhood"],
      },
    ],
  },
  {
    continent: "North America",
    country: "United States",
    countryCode: "US",
    cities: [
      {
        city: "San Francisco",
        state: "California",
        lat: 37.7749,
        lng: -122.4194,
        places: ["Lands End Trail|hike|v", "Ferry Building|market|v", "Tartine Manufactory|cafe|v", "Dolores Park|park|v"],
      },
      {
        city: "Big Sur",
        state: "California",
        lat: 36.2704,
        lng: -121.8081,
        places: ["McWay Falls|waterfall|v", "Bixby Bridge|viewpoint|v", "Pfeiffer Beach|beach"],
      },
      {
        city: "Joshua Tree",
        state: "California",
        lat: 33.8734,
        lng: -115.901,
        places: ["Hidden Valley|hike", "Keys View|viewpoint", "Pappy & Harriet's|bar"],
      },
      {
        city: "New York",
        state: "New York",
        lat: 40.7128,
        lng: -74.006,
        places: ["The High Line|park|v", "Chinatown|neighborhood|v", "Whitney Museum|museum", "Katz's Delicatessen|restaurant|v"],
      },
      {
        city: "Moab",
        state: "Utah",
        lat: 38.5733,
        lng: -109.5498,
        places: ["Delicate Arch|hike", "Mesa Arch Sunrise|viewpoint", "Dead Horse Point|viewpoint"],
      },
      {
        city: "Maui",
        state: "Hawaii",
        lat: 20.7984,
        lng: -156.3319,
        places: ["Road to Hana|viewpoint", "Haleakala Sunrise|viewpoint", "Waianapanapa|beach"],
      },
      {
        city: "New Orleans",
        state: "Louisiana",
        lat: 29.9511,
        lng: -90.0715,
        places: ["French Quarter|neighborhood", "Cafe du Monde|cafe", "Preservation Hall|bar"],
      },
    ],
  },
  {
    continent: "North America",
    country: "Mexico",
    countryCode: "MX",
    cities: [
      {
        city: "Mexico City",
        state: "CDMX",
        lat: 19.4326,
        lng: -99.1332,
        places: ["Coyoacan|neighborhood|v", "Museo Frida Kahlo|museum|v", "Mercado de Medellin|market", "Pujol|restaurant"],
      },
      {
        city: "Oaxaca",
        state: "Oaxaca",
        lat: 17.0732,
        lng: -96.7266,
        places: ["Mercado 20 de Noviembre|market", "Hierve el Agua|viewpoint", "Monte Alban|landmark"],
      },
      {
        city: "Tulum",
        state: "Quintana Roo",
        lat: 20.2114,
        lng: -87.4654,
        places: ["Gran Cenote|lake", "Tulum Ruins|landmark", "Playa Paraiso|beach"],
      },
    ],
  },
  {
    continent: "North America",
    country: "Canada",
    countryCode: "CA",
    cities: [
      {
        city: "Banff",
        state: "Alberta",
        lat: 51.1784,
        lng: -115.5708,
        places: ["Moraine Lake|lake", "Lake Louise|lake", "Sulphur Mountain|hike", "Johnston Canyon|waterfall"],
      },
      {
        city: "Vancouver",
        state: "British Columbia",
        lat: 49.2827,
        lng: -123.1207,
        places: ["Stanley Park|park|v", "Granville Island Market|market|v", "Grouse Grind|hike"],
      },
      {
        city: "Tofino",
        state: "British Columbia",
        lat: 49.1533,
        lng: -125.9066,
        places: ["Long Beach|beach", "Wickaninnish Inn|hotel"],
      },
    ],
  },
  {
    continent: "South America",
    country: "Chile",
    countryCode: "CL",
    cities: [
      {
        city: "Torres del Paine",
        state: "Magallanes",
        lat: -50.9423,
        lng: -73.4068,
        places: ["Base Las Torres|hike", "Grey Glacier|lake", "Salto Grande|waterfall"],
      },
      {
        city: "Santiago",
        state: "Santiago Metropolitan",
        lat: -33.4489,
        lng: -70.6693,
        places: ["Cerro San Cristobal|viewpoint", "Barrio Lastarria|neighborhood", "Mercado Central|market"],
      },
      {
        city: "Valparaiso",
        state: "Valparaiso",
        lat: -33.0472,
        lng: -71.6127,
        places: ["Cerro Alegre|neighborhood", "Ascensor Reina Victoria|landmark"],
      },
    ],
  },
  {
    continent: "South America",
    country: "Peru",
    countryCode: "PE",
    cities: [
      {
        city: "Cusco",
        state: "Cusco",
        lat: -13.5319,
        lng: -71.9675,
        places: ["Sacsayhuaman|landmark", "San Pedro Market|market", "Rainbow Mountain|hike"],
      },
      {
        city: "Aguas Calientes",
        state: "Cusco",
        lat: -13.1547,
        lng: -72.5254,
        places: ["Machu Picchu|landmark", "Huayna Picchu|hike"],
      },
      {
        city: "Lima",
        state: "Lima",
        lat: -12.0464,
        lng: -77.0428,
        places: ["Barranco|neighborhood", "Central|restaurant", "Malecon Cliffs|viewpoint"],
      },
    ],
  },
  {
    continent: "South America",
    country: "Argentina",
    countryCode: "AR",
    cities: [
      {
        city: "Buenos Aires",
        state: "Buenos Aires",
        lat: -34.6037,
        lng: -58.3816,
        places: ["Palermo Soho|neighborhood", "El Ateneo|landmark", "Don Julio|restaurant", "Floreria Atlantico|bar"],
      },
      {
        city: "El Chalten",
        state: "Santa Cruz",
        lat: -49.3315,
        lng: -72.886,
        places: ["Laguna de los Tres|hike", "Mirador Fitz Roy|viewpoint"],
      },
    ],
  },
  {
    continent: "Africa",
    country: "Morocco",
    countryCode: "MA",
    cities: [
      {
        city: "Marrakech",
        lat: 31.6295,
        lng: -7.9811,
        places: ["Jemaa el-Fnaa|market|v", "Le Jardin Majorelle|park|v", "Riad Yasmine|hotel", "Nomad Rooftop|restaurant"],
      },
      {
        city: "Chefchaouen",
        lat: 35.1688,
        lng: -5.2636,
        places: ["Blue Medina|neighborhood", "Spanish Mosque Viewpoint|viewpoint"],
      },
      {
        city: "Merzouga",
        lat: 31.0997,
        lng: -4.0128,
        places: ["Erg Chebbi Dunes|viewpoint", "Desert Luxury Camp|hotel"],
      },
    ],
  },
  {
    continent: "Africa",
    country: "South Africa",
    countryCode: "ZA",
    cities: [
      {
        city: "Cape Town",
        state: "Western Cape",
        lat: -33.9249,
        lng: 18.4241,
        places: ["Table Mountain|hike", "Bo-Kaap|neighborhood", "Kalk Bay|beach", "Test Kitchen|restaurant"],
      },
      {
        city: "Franschhoek",
        state: "Western Cape",
        lat: -33.9111,
        lng: 19.1222,
        places: ["Wine Tram|landmark", "Babylonstoren|park"],
      },
    ],
  },
  {
    continent: "Africa",
    country: "Tanzania",
    countryCode: "TZ",
    cities: [
      {
        city: "Zanzibar City",
        state: "Zanzibar",
        lat: -6.1659,
        lng: 39.2026,
        places: ["Stone Town|neighborhood", "Nungwi Beach|beach", "Forodhani Market|market"],
      },
      {
        city: "Serengeti",
        state: "Mara",
        lat: -2.3333,
        lng: 34.8333,
        places: ["Seronera Valley|park", "Balloon Safari|viewpoint"],
      },
    ],
  },
  {
    continent: "Oceania",
    country: "New Zealand",
    countryCode: "NZ",
    cities: [
      {
        city: "Queenstown",
        state: "Otago",
        lat: -45.0312,
        lng: 168.6626,
        places: ["Ben Lomond Track|hike", "Fergburger|restaurant", "Lake Wakatipu|lake"],
      },
      {
        city: "Wanaka",
        state: "Otago",
        lat: -44.7032,
        lng: 169.1321,
        places: ["Roys Peak|hike", "That Wanaka Tree|landmark", "Blue Pools|lake"],
      },
      {
        city: "Te Anau",
        state: "Southland",
        lat: -45.4144,
        lng: 167.7180,
        places: ["Milford Sound|lake", "Key Summit|hike"],
      },
    ],
  },
  {
    continent: "Oceania",
    country: "Australia",
    countryCode: "AU",
    cities: [
      {
        city: "Sydney",
        state: "New South Wales",
        lat: -33.8688,
        lng: 151.2093,
        places: ["Bondi to Coogee Walk|hike|v", "Sydney Opera House|landmark|v", "Carriageworks Market|market"],
      },
      {
        city: "Byron Bay",
        state: "New South Wales",
        lat: -28.6474,
        lng: 153.6020,
        places: ["Cape Byron Lighthouse|viewpoint", "Wategos Beach|beach"],
      },
      {
        city: "Melbourne",
        state: "Victoria",
        lat: -37.8136,
        lng: 144.9631,
        places: ["Fitzroy|neighborhood", "Queen Victoria Market|market", "Patricia Coffee|cafe"],
      },
    ],
  },
];
