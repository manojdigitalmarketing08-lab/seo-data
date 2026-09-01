// Same mapping as the geoMap used inline in every n8n "Call Google ..." node.
const GEO_MAP = {
  'united states': '2840',
  us: '2840',
  usa: '2840',
  india: '2356',
  in: '2356',
  'united kingdom': '2826',
  uk: '2826',
  canada: '2124',
  australia: '2036',
  germany: '2276',
  france: '2250',
  singapore: '2702',
  uae: '2784',
  global: null
};

function resolveGeoTargetConstant(location) {
  const loc = (location || 'india').toLowerCase().trim();
  const geoId = Object.prototype.hasOwnProperty.call(GEO_MAP, loc) ? GEO_MAP[loc] : '2356';
  return geoId ? `geoTargetConstants/${geoId}` : null;
}

module.exports = { resolveGeoTargetConstant };
