/** Shared mock facet data for filter pattern demos. */
export const TYPES = [
  { id: "restaurant", label: "Restaurant", count: 26 },
  { id: "other", label: "Uncategorized", count: 14 },
  { id: "landmark", label: "Landmark", count: 9 },
  { id: "cafe", label: "Café", count: 8 },
  { id: "hotel", label: "Hotel", count: 7 },
  { id: "park", label: "Park", count: 7 },
  { id: "viewpoint", label: "Viewpoint", count: 7 },
  { id: "hike", label: "Hike", count: 6 },
  { id: "lake", label: "Lake", count: 6 },
  { id: "city", label: "City", count: 3 },
  { id: "waterfall", label: "Waterfall", count: 3 },
  { id: "beach", label: "Beach", count: 2 },
  { id: "market", label: "Market", count: 1 },
];

export const STATUSES = [
  { id: "all", label: "Everything" },
  { id: "visited", label: "Visited" },
  { id: "inspiration", label: "Inspiration" },
];

export const GROUPINGS = [
  { id: "region", label: "Region" },
  { id: "type", label: "Type" },
];

export const TOTAL = TYPES.reduce((n, t) => n + t.count, 0);

export const PLACES = [
  { name: "Blue Bottle Coffee", type: "cafe", status: "visited", region: "California" },
  { name: "Golden Gate Bridge", type: "landmark", status: "visited", region: "California" },
  { name: "Muir Woods", type: "hike", status: "inspiration", region: "California" },
  { name: "Tartine Bakery", type: "cafe", status: "visited", region: "California" },
  { name: "Crissy Field", type: "park", status: "visited", region: "California" },
  { name: "Twin Peaks", type: "viewpoint", status: "inspiration", region: "California" },
  { name: "Ferry Building", type: "market", status: "visited", region: "California" },
  { name: "Alcatraz Island", type: "landmark", status: "inspiration", region: "California" },
  { name: "Ocean Beach", type: "beach", status: "visited", region: "California" },
  { name: "Lake Tahoe", type: "lake", status: "inspiration", region: "California" },
  { name: "Yosemite Valley", type: "hike", status: "inspiration", region: "California" },
  { name: "The French Laundry", type: "restaurant", status: "inspiration", region: "California" },
  { name: "Inn at the Presidio", type: "hotel", status: "visited", region: "California" },
  { name: "Mission Dolores Park", type: "park", status: "visited", region: "California" },
  { name: "Sausalito Waterfront", type: "viewpoint", status: "inspiration", region: "California" },
  { name: "Napa Valley", type: "city", status: "inspiration", region: "California" },
  { name: "Multnomah Falls", type: "waterfall", status: "inspiration", region: "Pacific NW" },
  { name: "Powell's Books", type: "landmark", status: "visited", region: "Pacific NW" },
  { name: "Cannon Beach", type: "beach", status: "inspiration", region: "Pacific NW" },
  { name: "Crater Lake", type: "lake", status: "inspiration", region: "Pacific NW" },
  { name: "Canlis", type: "restaurant", status: "inspiration", region: "Pacific NW" },
  { name: "Olympic National Park", type: "park", status: "inspiration", region: "Pacific NW" },
  { name: "Pike Place Market", type: "market", status: "visited", region: "Pacific NW" },
  { name: "Space Needle", type: "landmark", status: "visited", region: "Pacific NW" },
];
