/* =====================================================================
 * content-en.js ── 英文版內容（與 content.js 對應，依 id 對照）
 *  ● 公告（news）沿用中文；其餘欄位沒填英文時自動顯示中文
 * ===================================================================== */
window.SITE_EN = {
  orgName: 'Public Works Department, Taipei City Government',
  siteTitle: 'Taipei Public Works Explorer',
  siteSubtitle: 'Walk into the five engineering worlds of roads, waterways, parks, sewers and hillsides.'
};

window.ZONES_EN = {
  hub: { shortName: 'PWD HQ', title: 'Public Works Department', tagline: 'Headquarters of five engineering offices', badge: 'City Core',
    subtitle: 'Coordinating roads & bridges, flood control, parks, sewerage and slopeland conservation across Taipei — five offices linked by a ring road and a river.',
    metrics: ['Engineering offices', 'Major projects / yr', 'Citizen satisfaction'], services: ['Policies & results', 'Road excavation center', 'Tenders', '1999 Citizen Hotline'] },
  nco: { shortName: 'New Construction Office', title: 'New Construction Office', tagline: 'World of roads & bridges', badge: 'Roads · Bridges',
    subtitle: 'Paving quality, new river bridges and seismic retrofits, accessible sidewalks and utility tunnels — keeping every trip smooth and safe.',
    metrics: ['Road area maintained', 'Bridges managed', 'Utility tunnels'], services: ['Paving schedule', 'Accessible sidewalks', 'Excavation lookup', 'Utility tunnels'] },
  heo: { shortName: 'Hydraulic Engineering Office', title: 'Hydraulic Engineering Office', tagline: 'World of riversides & flood defense', badge: 'Flood · Riverside',
    subtitle: 'Operating pumping stations and floodgates to keep the basin dry, while running riverside parks and bike paths for everyone.',
    metrics: ['Pumping stations', 'Riverside bike paths', 'Riverside parks'], services: ['Riverside venue booking', 'Floodgate status', 'Bike path map', 'Live water levels'] },
  pkl: { shortName: 'Parks & Street Lights Office', title: 'Parks and Street Lights Office', tagline: 'World of parks, trees & lights', badge: 'Parks · Lights',
    subtitle: 'Seasonal flower shows, inclusive playgrounds, swaying street trees and smart LED lights watching over every street.',
    metrics: ['City parks', 'Smart street lights', 'Street trees'], services: ['Flower shows', 'Inclusive playgrounds', 'Report a broken light', 'Street trees'] },
  sso: { shortName: 'Sewerage Office', title: 'Sewerage Engineering Office', tagline: 'World of the underground water cycle', badge: 'Sewer · Reclaimed water',
    subtitle: 'The city’s underground cleaners: sewer networks and water reclamation centers, with Turtle Engineer patrolling the manholes.',
    metrics: ['Household connection', 'Sewage treated daily', 'Reclaimed water'], services: ['Sewer connection lookup', 'Back-alley makeover', 'Dihua Sports Park', 'Reclaimed water'] },
  geo: { shortName: 'Geotechnical Engineering Office', title: 'Geotechnical Engineering Office', tagline: 'World of hillsides & trails', badge: 'Slopes · Trails',
    subtitle: 'Guarding slopeland and streams together with the Mountain Elder, and linking the Taipei Grand Hike trails into nature.',
    metrics: ['Taipei Grand Hike', 'Streams restored', 'Slope monitors online'], services: ['Taipei Grand Hike', 'Slopeland lookup', 'Campsite booking', 'Soil & water conservation'] }
};

window.NPCS_EN = {
  'hub-1': { name: 'Kiko', role: 'PWD receptionist', greet: ['Welcome to the Public Works Department! Lovely day for a walk.'],
    lines: ['Five engineering offices work together to look after Taipei.', 'The rainbow walkway in front of City Hall is a great photo spot!', 'Potholes or broken lights? Just call the 1999 hotline.'] },
  'nco-1': { name: 'Paver Pu', role: 'Road engineer', greet: ['Hi! Watch your step — we’re repaving ahead.'],
    lines: ['We repave at night so the road is smooth again by morning.', 'The new Zhongzheng Bridge is the longest three-hinged steel arch in Taiwan.', 'Utilities dig together on one schedule, so the same road isn’t dug twice.'] },
  'heo-1': { name: 'Hsun', role: 'Flood engineer', greet: ['Hello! The river breeze is great today — fancy a bike ride?'],
    lines: ['When it pours, pumping stations push rainwater out to the river.', 'Before a floodgate closes we send alerts — please move your car out.', 'Riverside bike paths connect lots of parks. Perfect for weekends!'] },
  'pkl-1': { name: 'Auntie Hua', role: 'Park gardener', greet: ['Hi there! The flowers are in full bloom this season.'],
    lines: ['Every street tree is recorded and cared for.', 'Note the pole number when reporting a broken light — it’s faster.', 'Inclusive playgrounds let every child play together.'] },
  'sso-1': { name: 'Ching', role: 'Sewer engineer', greet: ['Hey! Water gets clean down here, believe it or not.'],
    lines: ['Connecting homes to sewers keeps our rivers clean.', 'Never drop cigarette butts into drains — the filters are plastic.', 'Reclaimed water washes streets and waters plants.'] },
  'geo-1': { name: 'Ranger Shan', role: 'Mountain ranger', greet: ['Good climb! Take a sip of water — the air up here is great.'],
    lines: ['Hike the Taipei Grand Hike section by section and collect stamps.', 'Spot cracks or falling rocks after heavy rain? Report them right away.', 'Fireflies are back in the streams we restored naturally.'] },
  turtle: { name: 'Turtle Engineer', role: 'Sewer patroller', greet: ['Hi hi! Just finished patrolling the pipes — all clear!'],
    lines: ['Please don’t pour oil down the sink — the pipes get clogged!'] },
  god: { name: 'Mountain Elder', role: 'Guardian of the slopes', greet: ['Ho ho ho, welcome to the mountain, young one.'],
    lines: ['Trees hold the soil; care for the forest and it will care for you.', 'Stay away from streams in the rain, and walk around fallen rocks.'] }
};
