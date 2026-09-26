import { catalog, CatalogProduct } from './catalog';
import type { Profile, Recipe } from './recipes';

export type GeneratorOptions = { components: 2 | 3; tngOnly: boolean };
type TasteProfile = Exclude<Profile, 'Все'>;

const keywords: Record<TasteProfile, string[]> = {
  'Фруктовый': ['mango','passion','pineapple','peach','apricot','banana','guava','pear','apple','melon','watermelon','grape','lychee','litchi','kiwi','papaya','pomegranate','fig','plum','quince','feijoa','coconut','fruit','манго','маракуй','ананас','персик','абрикос','банан','гуава','груш','яблок','дын','арбуз','виноград','личи','киви','папай','гранат','инжир','слив','айва','фейхоа','кокос','фрукт'],
  'Ягодный': ['berry','raspberry','strawberry','currant','cherry','blueberry','cranberry','blackberry','barberry','elderberry','mulberry','wild forest','ягод','малин','клубник','смородин','вишн','черник','клюкв','ежевик','барбарис','бузин','шелковиц'],
  'Цитрусовый': ['lemon','lime','orange','grapefruit','citrus','yuzu','tangerine','mandarin','bergamot','pomelo','lemonade','лимон','лайм','апельсин','грейпфрут','цитрус','юдзу','мандарин','бергамот','помело','лимонад'],
  'Десертный': ['vanilla','cream','cookie','cake','waffle','caramel','chocolate','cocoa','milk','yogurt','yoghurt','muffin','cheesecake','biscuit','candy','gum','marshmallow','honey','nut','pistachio','popcorn','tiramisu','dessert','ванил','крем','печень','пирог','вафл','карамел','шоколад','какао','молок','йогурт','маффин','чизкейк','бисквит','конфет','жвач','маршмел','мед','орех','фисташ','попкорн','десерт'],
  'Свежий': ['mint','ice','freeze','frost','cool','cucumber','basil','aloe','eucalyptus','tarragon','lemongrass','soda','tonic','tea','cola','energy','мят','лед','холод','огур','базилик','алоэ','эвкалипт','тархун','лемонграс','содовая','тоник','чай','кола','энергетик'],
};

const compatibility: Record<TasteProfile, TasteProfile[]> = {
  'Фруктовый': ['Цитрусовый', 'Ягодный', 'Свежий', 'Десертный'],
  'Ягодный': ['Фруктовый', 'Цитрусовый', 'Десертный', 'Свежий'],
  'Цитрусовый': ['Фруктовый', 'Свежий', 'Ягодный'],
  'Десертный': ['Фруктовый', 'Ягодный', 'Цитрусовый'],
  'Свежий': ['Фруктовый', 'Цитрусовый', 'Ягодный'],
};

const colors: Record<TasteProfile, string> = {
  'Фруктовый': '#E9A178', 'Ягодный': '#C98CA8', 'Цитрусовый': '#D6D879', 'Десертный': '#D4B487', 'Свежий': '#83C3A0',
};

const descriptions: Record<TasteProfile, string> = {
  'Фруктовый': 'Фруктовая основа с контрастной поддержкой и чистым послевкусием.',
  'Ягодный': 'Ягодный микс с балансом сладости, кислинки и фоновой ноты.',
  'Цитрусовый': 'Яркая цитрусовая основа с поддержкой, которая смягчает кислотность.',
  'Десертный': 'Мягкий десертный профиль с акцентом, который не даёт миксу стать приторным.',
  'Свежий': 'Свежий профиль с сочной основой и умеренным прохладным акцентом.',
};

const normalize = (value: string) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е');
const tasteProfiles = Object.keys(keywords) as TasteProfile[];

export function productProfiles(product: CatalogProduct): TasteProfile[] {
  const name = normalize(`${product.name} ${product.shortName}`);
  return tasteProfiles.filter(profile => keywords[profile].some(keyword => name.includes(keyword)));
}

function pick<T>(items: T[], random: () => number): T {
  if (!items.length) throw new Error('Не хватает распознанных вкусов для генерации');
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}

function pickRotated<T>(items: T[], random: () => number, offset: number): T {
  if (!items.length) throw new Error('Не хватает распознанных вкусов для генерации');
  return items[(Math.floor(random() * items.length) + offset) % items.length];
}

function profilesOf(product: CatalogProduct, cache?: Map<string, TasteProfile[]>): TasteProfile[] {
  return cache?.get(product.id) ?? productProfiles(product);
}

function productsFor(profiles: TasteProfile[], source: CatalogProduct[], used: Set<string>, cache?: Map<string, TasteProfile[]>): CatalogProduct[] {
  return source.filter(product => !used.has(product.id) && profilesOf(product, cache).some(profile => profiles.includes(profile)));
}

const pairScores: Record<TasteProfile, Record<TasteProfile, number>> = {
  'Фруктовый': { 'Фруктовый': 2, 'Ягодный': 5, 'Цитрусовый': 5, 'Десертный': 4, 'Свежий': 4 },
  'Ягодный': { 'Фруктовый': 5, 'Ягодный': 2, 'Цитрусовый': 5, 'Десертный': 4, 'Свежий': 4 },
  'Цитрусовый': { 'Фруктовый': 5, 'Ягодный': 5, 'Цитрусовый': 1, 'Десертный': 3, 'Свежий': 4 },
  'Десертный': { 'Фруктовый': 4, 'Ягодный': 4, 'Цитрусовый': 3, 'Десертный': 1, 'Свежий': 0 },
  'Свежий': { 'Фруктовый': 4, 'Ягодный': 4, 'Цитрусовый': 4, 'Десертный': 0, 'Свежий': -5 },
};

const coolingKeywords = ['ice','freeze','frost','cool','mint','eucalyptus','лед','холод','мят','эвкалипт'];
const dominantKeywords = ['anise','cinnamon','lavender','basil','eucalyptus','rose','coffee','cola','clove','анис','кориц','лаванд','базилик','эвкалипт','роз','кофе','кола','гвоздик'];

function hasKeyword(product: CatalogProduct, words: string[]): boolean {
  const name = normalize(`${product.name} ${product.shortName}`);
  return words.some(word => name.includes(word));
}

function bestPairScore(left: CatalogProduct, right: CatalogProduct, cache?: Map<string, TasteProfile[]>): number {
  const leftProfiles = profilesOf(left, cache);
  const rightProfiles = profilesOf(right, cache);
  return Math.max(...leftProfiles.flatMap(a => rightProfiles.map(b => pairScores[a][b])));
}

export function scoreRecipeProducts(products: CatalogProduct[], target: TasteProfile, cache?: Map<string, TasteProfile[]>): number {
  if (products.length < 2 || new Set(products.map(product => product.id)).size !== products.length) return -Infinity;
  let score = profilesOf(products[0], cache).includes(target) ? 8 : -8;
  for (let left = 0; left < products.length; left += 1) {
    for (let right = left + 1; right < products.length; right += 1) score += bestPairScore(products[left], products[right], cache);
  }
  const coolingCount = products.filter(product => hasKeyword(product, coolingKeywords)).length;
  const dominantCount = products.filter(product => hasKeyword(product, dominantKeywords)).length;
  if (coolingCount > 1) score -= (coolingCount - 1) * 12;
  if (dominantCount > 1) score -= (dominantCount - 1) * 7;
  const representedProfiles = new Set(products.flatMap(product => profilesOf(product, cache))).size;
  score += Math.min(representedProfiles, 3);
  return score;
}

export function generateRecipe(profile: Profile, options: GeneratorOptions, previousId?: Recipe['id'], random = Math.random): Recipe {
  const target = profile === 'Все' ? pick(tasteProfiles, random) : profile;
  const source = options.tngOnly ? catalog.filter(product => product.tng) : catalog;
  const profileCache = new Map(source.map(product => [product.id, productProfiles(product)]));
  const proportions = options.components === 2 ? pick([[60, 40], [55, 45], [50, 50]] as const, random) : pick([[50, 30, 20], [45, 35, 20], [50, 35, 15], [40, 35, 25]] as const, random);
  const candidates = new Map<string, { products: CatalogProduct[]; score: number }>();
  const primaryPool = productsFor([target], source, new Set(), profileCache);

  for (let attempt = 0; attempt < 180; attempt += 1) {
    const used = new Set<string>();
    const primary = pickRotated(primaryPool, random, attempt * 7);
    used.add(primary.id);
    const secondary = pickRotated(productsFor(compatibility[target], source, used, profileCache), random, attempt * 11);
    used.add(secondary.id);
    const products = [primary, secondary];
    if (options.components === 3) {
      const accentProfiles: TasteProfile[] = target === 'Десертный' ? ['Цитрусовый', 'Ягодный', 'Свежий'] : ['Свежий', 'Цитрусовый', 'Десертный'];
      const accentPool = productsFor(accentProfiles, source, used, profileCache);
      products.push(pickRotated(accentPool.length ? accentPool : productsFor(compatibility[target], source, used, profileCache), random, attempt * 13));
    }
    const key = products.map(product => product.id).join('+');
    const id = `generated:${key}:${proportions.join('-')}`;
    if (id !== String(previousId)) candidates.set(key, { products, score: scoreRecipeProducts(products, target, profileCache) });
  }

  const ranked = [...candidates.values()].sort((left, right) => right.score - left.score);
  const best = pick(ranked.slice(0, Math.min(12, ranked.length)), random);
  const id = `generated:${best.products.map(product => product.id).join('+')}:${proportions.join('-')}`;
  return {
    id,
    name: best.products.map(product => product.shortName).join(' × '),
    profile: target,
    description: descriptions[target],
    ingredients: best.products.map((product, index) => [`${product.brand} · ${product.shortName}`, proportions[index]]),
    color: colors[target],
    note: `Подобрано по балансу основы, поддержки и акцента${options.tngOnly ? ' среди марок TNG' : ''}. Крепость и доступность продуктов согласуйте с мастером.`,
    generated: { catalogIds: best.products.map(product => product.id), tngOnly: options.tngOnly },
  };
}
