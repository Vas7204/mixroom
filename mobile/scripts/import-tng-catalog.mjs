import { writeFile } from 'node:fs/promises';

async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/<[^>]+>/g, '').trim();
const products = [];

for (let page = 1; page <= 11; page++) {
  const url = `https://www.tangiers.us/flavors${page === 1 ? '' : `?comp-kyy6fcwa_page=${page}`}`;
  const body = await get(url);
  const rows = [...body.matchAll(/<tr class="[^"]*wixui-table__row" role="row">([\s\S]*?)<\/tr>/g)];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(cell => decode(cell[1]));
    const match = cells[0]?.match(/^(\d+[A-Z]?)\s*-\s*(.+)$/);
    if (!match) continue;
    for (const [index, line] of ['Noir', 'F-Line', 'Birquq', 'Burley'].entries()) {
      if (cells[index + 1] !== '✔') continue;
      products.push({ id: `tangiers-${line.toLowerCase()}-${match[1].toLowerCase()}`, brand: 'Tangiers', name: `${line} · ${match[2]}`, shortName: match[2], url });
    }
  }
  console.log(`Tangiers page ${page}: ${rows.length} rows`);
}

const dogmaUrl = 'https://dogma-tobacco.ru/catalog/aromaticheskaya-lineyka-3';
const dogmaHtml = await get(dogmaUrl);
for (const match of dogmaHtml.matchAll(/<div href="([^"]+)" class="catalog-item__image">[\s\S]*?<h3 class="catalog-item__name">\s*<span[^>]*>([\s\S]*?)<\/span>/g)) {
  const name = decode(match[2]);
  products.push({ id: `dogma-${match[1].split('/').pop()}`, brand: 'Dogma', name, shortName: name, url: new URL(match[1], dogmaUrl).href });
}

const boncheUrl = 'https://bonche.ru/products';
for (let page = 1; page <= 3; page++) {
  const api = new URL('https://store.tildaapi.com/api/getproductslist/');
  api.searchParams.set('storepartuid', '528368059956');
  api.searchParams.set('recid', '2056530681');
  api.searchParams.set('flag_root', 'withroot');
  api.searchParams.set('slice', String(page));
  const data = JSON.parse(await get(api));
  for (const item of data.products || []) {
    products.push({ id: `bonche-${item.uid}`, brand: 'Bonche', name: item.title, shortName: item.title, url: item.url || boncheUrl });
  }
}

// Public catalogue linked by the official Trofimoff's channel. The PDF's text layer
// is partly damaged, so names are preserved in their original Latin spelling.
const trofimoffUrl = 'https://drive.google.com/file/d/1MkkZRr8Qak0-28k6LvUsVcSClG6fBJZB/view';
const trofimoff = [
  'Kiwi','Nurr','Double Apple','Opuntia Pear','Green Tea','Sri Lanka','Cocos','Mint','Bailey’s','Peche','Hurtleberry',
  'Tangerine','Coke','Old School Orange','Crespino','Lavander','Yellow Lemon','Pineapple','Elder Flowers','Cashmere Nectarine',
  'Cashmere Guava','Wintergreen','Regan','Green Apple','Hazel Hut','Passion Fruit','Finlandia Vanila','Virgin','Ortica','Jenever',
  'Limoncello','Cognac','Shurale','Spirit','Like-Zaghoul','Italia','Pepe','Crio','Drama','Connecticut','Futura','Becherovka',
  'Karelia','Calvados','Pear Date','Minttu','Weed','Verry Berry','Matricaria','Salvia','Crud','Cavendish','Bellini','Stout','Tequila','PROGREV'
];
for (const name of trofimoff) products.push({ id: `trofimoff-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, brand: "Trofimoff's", name, shortName: name, url: trofimoffUrl });

// BLANSH was launched by the group behind TNG in 2025; the official TNG site
// identifies the brand, while the declared 2026 range supplies the flavor names.
const blanshUrl = 'https://tangierslounge.ru/franchise/';
const blansh = ['Блэккурант','Сливки 33%','Мангомания','Киви краш','Клубничка 18+','Лимонный фреш','Варёная кукуруза','Вишнёвый сад','Клюквенный морс','Маракуйя','Грейпфрутовый сок','Яблоко наливное','Ягода малинка','Виноградная гроздь','Ленинградская пышка','Ананасовый экспресс','Карамельное чтиво','Лайм тайм','Персик в личку','Ягодный каркаде'];
for (const [index, name] of blansh.entries()) products.push({ id: `blansh-${index + 1}`, brand: 'BLANSH', name, shortName: name, url: blanshUrl });

// TNG's own history names Azure as a distribution project. These registered
// waterpipe products are the complete public 2026 list available from Spain's
// Ministry of Health tobacco-product register.
const azureUrl = 'https://www.sanidad.gob.es/en/areas/promocionPrevencion/tabaco/industria/docs/Productos_Tabaco_Espana.pdf';
const azure = ['Alaskan Ice','Blueberry Muffin','Carolina Peach','Chocolate Mint','Cinnamon Cookies','Cosmos','Grow a Pear','Hokkaido Melon','Lemon Muffin','Lemongrass','Lime','Mango Cheesecake','Matcha Mint','MexiCola','Moroccan Tea','Morocco Mentha','Napa Grape','Rio Mint','Route 66','Royal Raspberry','San Diego Sunset','Strawberry Passion','Watermelon','Cherry Muffin','Ultra Violet','Cocomania'];
for (const [index, name] of azure.entries()) products.push({ id: `azure-${index + 1}`, brand: 'Azure', name, shortName: name, url: azureUrl });

const unique = [...new Map(products.map(item => [item.id, item])).values()].sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name, 'ru'));
if (unique.filter(item => item.brand === 'Tangiers').length < 80 || unique.filter(item => item.brand === 'Dogma').length < 10 || unique.filter(item => item.brand === 'Bonche').length < 70) {
  throw new Error(`Suspiciously small import: ${unique.length} products`);
}
await writeFile(new URL('../tng-catalog.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString().slice(0, 10), sources: ['https://tangierslounge.ru/', 'https://tangierslounge.ru/franchise/', 'https://www.tangiers.us/flavors', dogmaUrl, boncheUrl, trofimoffUrl, azureUrl], products: unique }, null, 2) + '\n');
console.log(`Imported ${unique.length} TNG-listed brand products`);
