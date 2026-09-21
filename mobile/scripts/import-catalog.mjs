import { writeFile } from 'node:fs/promises';

const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
async function html(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

const musthave = [];
for (let page = 1; page <= 9; page++) {
  const base = 'https://musthave.ru/category/tabak-dlya-kalyana/';
  const body = await html(page === 1 ? base : `${base}?page=${page}`);
  for (const match of body.matchAll(/<a href="([^"]+)" class="goods-card"[\s\S]*?<div class="goods-card__name[^>]*>([\s\S]*?)<\/div>/g)) {
    const name = decode(match[2]);
    const english = name.match(/\(([^)]+)\)$/)?.[1];
    if (!name) continue;
    musthave.push({ id: `mh-${match[1].replace(/\W/g, '-')}`, brand: 'MUSTHAVE', name, shortName: english || name, url: new URL(match[1], base).href });
  }
}

const darksideUrl = 'https://darksideshop.com/brands/darkside/?products=tobacco';
const darksideHtml = await html(darksideUrl);
const darkside = [];
const table = darksideHtml.match(/<table class="filter-table[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1];
if (!table) throw new Error('DARKSIDE product table not found');
for (const match of table.matchAll(/<tr data-item-id="[^"]+">([\s\S]*?)<\/tr>/g)) {
  const fields = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(item => decode(item[1]));
  if (fields[1]?.toUpperCase() !== 'DARKSIDE' || !fields[0]) continue;
  darkside.push({ id: `ds-${fields[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, brand: 'DARKSIDE', name: fields[0], shortName: fields[0], url: darksideUrl });
}

const byId = new Map([...musthave, ...darkside].map(item => [item.id, item]));
const products = [...byId.values()].sort((a,b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name, 'ru'));
if (musthave.length < 90 || darkside.length < 40) throw new Error(`Catalog is suspiciously small: MUSTHAVE ${musthave.length}, DARKSIDE ${darkside.length}`);
await writeFile(new URL('../catalog.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString().slice(0,10), sources: [darksideUrl, 'https://musthave.ru/category/tabak-dlya-kalyana/'], products }, null, 2) + '\n');
console.log(`Imported ${products.length} products: MUSTHAVE ${musthave.length}, DARKSIDE ${darkside.length}`);
