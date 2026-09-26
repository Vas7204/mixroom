import raw from './catalog.json';
import tngRaw from './tng-catalog.json';

export type TobaccoBrand = 'DARKSIDE' | 'MUSTHAVE' | 'Tangiers' | "Trofimoff's" | 'Bonche' | 'Dogma' | 'BLANSH' | 'Azure';
export type Brand = 'Все марки' | 'TNG' | TobaccoBrand;
export type CatalogProduct = { id: string; brand: TobaccoBrand; name: string; shortName: string; url: string; tng: boolean };
export const brands: Brand[] = ['Все марки', 'TNG', 'Tangiers', 'BLANSH', 'Azure', "Trofimoff's", 'Bonche', 'Dogma', 'DARKSIDE', 'MUSTHAVE'];
const tngBrands = new Set<TobaccoBrand>(['Tangiers', "Trofimoff's", 'Bonche', 'Dogma', 'BLANSH', 'Azure']);
export const catalog = [...raw.products, ...tngRaw.products]
  .map(item => ({ ...item, tng: tngBrands.has(item.brand as TobaccoBrand) })) as CatalogProduct[];
export const catalogCheckedAt = [raw.checkedAt, tngRaw.checkedAt].sort().at(-1);

const englishNotes: Record<string, string[]> = {
  'манго': ['mango'], 'маракуйя': ['passion'], 'мята': ['mint'], 'черника': ['blueberry', 'blue'],
  'малина': ['raspberry'], 'черная смородина': ['blackcurrant', 'black currant'],
  'лимон': ['lemon'], 'ваниль': ['vanilla', 'cream'], 'печенье': ['cookie', 'waffle'],
  'грейпфрут': ['grapefruit'], 'лайм': ['lime'], 'зеленое яблоко': ['apple', 'granny'],
  'персик': ['peach'], 'вишня': ['cherry'], 'апельсин': ['orange'], 'дыня': ['melon'],
  'огурец': ['cucunade'], 'чай': ['tea'], 'чёрный чай': ['tea'], 'бергамот': ['bergamon']
};
const normalize = (value: string) => value.toLocaleLowerCase('ru').replaceAll('ё','е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function searchCatalog(query: string, brand: Brand = 'Все марки'): CatalogProduct[] {
  const needle = normalize(query);
  const synonyms = englishNotes[needle] || [];
  return catalog.filter(product => {
    if (brand === 'TNG' && !product.tng) return false;
    if (brand !== 'Все марки' && brand !== 'TNG' && product.brand !== brand) return false;
    if (!needle) return true;
    const haystack = normalize(`${product.brand} ${product.name} ${product.shortName}`);
    return haystack.includes(needle) || synonyms.some(word => haystack.includes(word));
  });
}
