import React, { useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, Share, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { chooseRecipe, Profile, profiles, Recipe, recipes, recipeText } from './recipes';
import { s } from './styles';
import { CatalogScreen } from './CatalogScreen';
import { catalog } from './catalog';

export default function App() {
  const [profile, setProfile] = useState<Profile>('Все');
  const [selected, setSelected] = useState<Recipe>(recipes[0]);
  const [opened, setOpened] = useState(false);
  const [screen, setScreen] = useState<'mixes' | 'catalog'>('mixes');
  const [catalogQuery, setCatalogQuery] = useState('');
  function openCatalog(query = '') { setOpened(false); setCatalogQuery(query); setScreen('catalog'); }
  function selectProfile(value: Profile) {
    setProfile(value);
    if (value !== 'Все' && selected.profile !== value) setSelected(recipes.find(r => r.profile === value)!);
  }
  async function share() {
    try { await Share.share({ message: recipeText(selected), title: selected.name }); }
    catch { Alert.alert('Не удалось поделиться', 'Попробуйте ещё раз или покажите карточку с экрана.'); }
  }
  const matches = recipes.filter(r => (profile === 'Все' || r.profile === profile) && r.id !== selected.id);
  return <SafeAreaView style={s.safe}>
    <StatusBar style={opened ? 'dark' : 'light'} />
    {screen === 'catalog' ? <CatalogScreen initialQuery={catalogQuery} onClose={() => setScreen('mixes')} /> : <ScrollView contentContainerStyle={s.content}>
      <View style={s.header}><Text style={s.logo}>mixroom<Text style={{color:'#D5F589'}}> ◌</Text></Text><Text style={s.meta}>18+ · бесплатно</Text></View>
      <Pressable accessibilityRole="button" onPress={() => openCatalog()} style={{alignSelf:'flex-start',paddingVertical:10,marginBottom:15}}><Text style={{fontSize:16,fontWeight:'600',color:'#D5F589'}}>Палитра марок · {catalog.length} вкусов ↗</Text></Pressable>
      <Text style={s.eyebrow}>ТВОЙ СЛЕДУЮЩИЙ МИКС</Text>
      <Text style={s.title}>Что сегодня{'\n'}по вкусу?</Text>
      <Text style={s.subtitle}>Выбери направление. Остальное придумаем.</Text>
      <View style={s.chips}>{profiles.map(p => <Pressable key={p} onPress={() => selectProfile(p)} accessibilityRole="button" accessibilityState={{selected:profile === p}} style={[s.chip, profile === p && s.activeChip]}><Text style={[s.chipText,profile === p && s.activeText]}>{p}</Text></Pressable>)}</View>
      <View style={[s.card,{borderColor:selected.color}]} accessibilityLiveRegion="polite">
        <View style={s.row}><Text style={[s.eyebrow,{color:selected.color}]}>{selected.profile.toUpperCase()}</Text><Text style={s.meta}>МИКС / {String(selected.id).padStart(2,'0')}</Text></View>
        <Text style={s.recipeTitle}>{selected.name}</Text>
        <Text style={s.description}>{selected.description}</Text>
        <View style={s.bar}>{selected.ingredients.map(([name,percent],i) => <View key={name} style={{flex:percent,backgroundColor:selected.color,opacity:1-i*.25}} />)}</View>
        {selected.ingredients.map(([name,percent],i) => <View key={name} style={s.ingredient}><View style={[s.dot,{backgroundColor:selected.color,opacity:1-i*.25}]} /><Text style={s.ingredientName}>{name}</Text><Text style={s.percent}>{percent}%</Text></View>)}
        <Pressable accessibilityRole="button" style={s.outlineButton} onPress={() => setOpened(true)}><Text style={s.whiteButtonText}>Показать мастеру ↗</Text></Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={() => setSelected(chooseRecipe(profile,selected.id))} style={({pressed}) => [s.primary, pressed && {opacity:.8}]}><Text style={s.primaryText}>↻  Удиви меня</Text></Pressable>
      <Text style={s.hint}>В выбранном направлении, без повтора предыдущего</Text>
      <View style={s.section}><Text style={s.sectionTitle}>Ещё по вкусу</Text><Text style={s.meta}>{matches.length} вариантов</Text></View>
      {matches.map(r => <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Открыть рецепт ${r.name}`} onPress={() => {setSelected(r); setOpened(true);}} style={s.listItem}><View style={[s.swatch,{backgroundColor:r.color}]}><Text style={s.swatchText}>{String(r.id).padStart(2,'0')}</Text></View><View style={{flex:1}}><Text style={s.listTitle}>{r.name}</Text><Text style={s.listSub}>{r.ingredients.map(i => i[0]).join(' · ')}</Text></View><Text style={s.arrow}>↗</Text></Pressable>)}
      <Text style={s.footer}>Вкусовые идеи, а не проверенные рецептуры. Бренды, крепость и пропорции уточняй у мастера.</Text>
    </ScrollView>}
    <Modal visible={opened} animationType="slide" onRequestClose={() => setOpened(false)}>
      <SafeAreaView style={s.recipeSafe}><ScrollView contentContainerStyle={s.sheet}>
        <View style={s.header}><Text style={s.sheetBrand}>mixroom / рецепт</Text><Pressable accessibilityRole="button" onPress={() => setOpened(false)} style={s.close}><Text style={s.closeText}>Закрыть ×</Text></Pressable></View>
        <Text style={s.paperEyebrow}>ДЛЯ КАЛЬЯННОГО МАСТЕРА</Text><Text style={s.paperTitle}>{selected.name}</Text><Text style={s.paperDescription}>{selected.description}</Text>
        <View style={s.paperIngredients}>{selected.ingredients.map(([name,percent]) => <Pressable accessibilityRole="button" accessibilityLabel={`Найти ${name} в палитре марок`} onPress={() => openCatalog(name)} key={name} style={s.paperRow}><Text style={s.paperName}>{name} ↗</Text><Text style={s.paperPercent}>{percent}%</Text></Pressable>)}</View>
        <Text style={s.paperEyebrow}>ПОЖЕЛАНИЕ</Text><Text style={s.paperNote}>{selected.note}</Text>
        <Text style={s.paperHint}>Проценты — ориентир по составу микса. Подберите доступные аналоги и согласуйте крепость отдельно. Интенсивность зависит от бренда.</Text>
        <Pressable accessibilityRole="button" style={s.shareButton} onPress={share}><Text style={s.whiteButtonText}>Поделиться рецептом</Text></Pressable>
      </ScrollView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
