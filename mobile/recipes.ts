export type Profile = 'Все' | 'Фруктовый' | 'Ягодный' | 'Цитрусовый' | 'Десертный' | 'Свежий';
export type Recipe = { id: number; name: string; profile: Profile; description: string; ingredients: [string, number][]; color: string; note: string };
export const profiles: Profile[] = ['Все', 'Фруктовый', 'Ягодный', 'Цитрусовый', 'Десертный', 'Свежий'];
export const recipes: Recipe[] = [
 {id:1,name:'Тропический вечер',profile:'Фруктовый',description:'Сочное манго, кислинка маракуйи и прохладный финал.',ingredients:[['Манго',50],['Маракуйя',35],['Мята',15]],color:'#DFBD74',note:'Манго — основной вкус. Мята должна оставаться фоном.'},
 {id:2,name:'Ягодный лес',profile:'Ягодный',description:'Тёмные ягоды с мягкой сладостью малины.',ingredients:[['Черника',45],['Малина',35],['Чёрная смородина',20]],color:'#BB9BDD',note:'Смородина добавляет кислинку; не должна перебивать остальные ягоды.'},
 {id:3,name:'Лимонный пирог',profile:'Десертный',description:'Лимонная цедра, ваниль и тёплая нота печенья.',ingredients:[['Лимон',35],['Ваниль',25],['Печенье',40]],color:'#E7CE84',note:'Нужен мягкий десертный профиль с заметной лимонной нотой.'},
 {id:4,name:'Цитрус-тоник',profile:'Цитрусовый',description:'Грейпфрут и лайм с лёгкой мятной прохладой.',ingredients:[['Грейпфрут',55],['Лайм',35],['Мята',10]],color:'#C6D887',note:'Акцент на цитрусовой горчинке. Мяту оставить деликатной.'},
 {id:5,name:'Зелёная волна',profile:'Свежий',description:'Хрустящее яблоко, огурец и свежая мята.',ingredients:[['Зелёное яблоко',50],['Огурец',35],['Мята',15]],color:'#8DC9B0',note:'Свежий, умеренно сладкий профиль.'},
 {id:6,name:'Персиковый чай',profile:'Фруктовый',description:'Спелый персик с терпкостью чая и лимоном.',ingredients:[['Персик',50],['Чёрный чай',35],['Лимон',15]],color:'#E9A47E',note:'Чай — заметная основа, лимон — небольшой акцент.'},
 {id:7,name:'Малиновый крем',profile:'Десертный',description:'Малина со сливочной ванилью и печеньем.',ingredients:[['Малина',45],['Ванильный крем',35],['Печенье',20]],color:'#DCA5BB',note:'Ягода должна чувствоваться ярче крема.'},
 {id:8,name:'Вишнёвый сад',profile:'Ягодный',description:'Вишня и чёрная смородина с мягкой ванилью.',ingredients:[['Вишня',55],['Чёрная смородина',25],['Ваниль',20]],color:'#D895A5',note:'Кисло-сладкий ягодный профиль, ваниль для округлости.'},
 {id:9,name:'Апельсиновый чай',profile:'Цитрусовый',description:'Апельсин, бергамот и мягкая чайная терпкость.',ingredients:[['Апельсин',50],['Чёрный чай',35],['Бергамот',15]],color:'#E6B06D',note:'Бергамот — только акцент, его интенсивность зависит от выбранного продукта.'},
 {id:10,name:'Дынный бриз',profile:'Свежий',description:'Сладкая дыня с огурцом и лёгкой прохладой.',ingredients:[['Дыня',55],['Огурец',35],['Мята',10]],color:'#AFD2A0',note:'Прохлада лёгкая, основной вкус — дыня.'}
];
export function chooseRecipe(profile: Profile, previousId?: number, random = Math.random): Recipe {
 const pool = recipes.filter(r => (profile === 'Все' || r.profile === profile) && r.id !== previousId);
 if (!pool.length) throw new Error('Нет подходящих рецептов');
 return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
}
export function recipeText(r: Recipe): string {
 return `${r.name}\n${r.profile} микс\n\n${r.ingredients.map(([name, percent]) => `${name} — ${percent}%`).join('\n')}\n\nПожелание: ${r.note}\n\nЭто вкусовой ориентир. Бренды, крепость и итоговые пропорции согласуйте с мастером.`;
}
