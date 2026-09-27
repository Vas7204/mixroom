import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, SafeAreaView, ScrollView, Share, Text, View } from 'react-native';
import { CatalogScreen } from './CatalogScreen';
import { catalog } from './catalog';
import { generateRecipe, GeneratorOptions } from './generator';
import { Profile, profiles, Recipe, recipes, recipeText } from './recipes';
import { s } from './styles';
import { APP_VERSION, AppUpdate, fetchAvailableUpdate } from './updates';

const favoritesKey = 'mixroom:favorites:v1';
const generatedFavoritesKey = 'mixroom:generated-favorites:v1';

function isGeneratedRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') return false;
  const recipe = value as Partial<Recipe>;
  return typeof recipe.id === 'string' && recipe.id.startsWith('generated:') &&
    typeof recipe.name === 'string' && Array.isArray(recipe.ingredients) &&
    Boolean(recipe.generated?.catalogIds?.length);
}

export default function App() {
  const [profile, setProfile] = useState<Profile>('Все');
  const [selected, setSelected] = useState<Recipe>(recipes[0]);
  const [opened, setOpened] = useState(false);
  const [screen, setScreen] = useState<'mixes' | 'catalog'>('mixes');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [savedGenerated, setSavedGenerated] = useState<Recipe[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [generatorOptions, setGeneratorOptions] = useState<GeneratorOptions>({ components: 3, tngOnly: false });
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAuthors, setShowAuthors] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'checking' | 'current' | 'available' | 'error'>('checking');
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(favoritesKey), AsyncStorage.getItem(generatedFavoritesKey)])
      .then(([idsValue, generatedValue]) => {
        if (!active) return;
        const storedGenerated = generatedValue ? JSON.parse(generatedValue) : [];
        const validGenerated = Array.isArray(storedGenerated) ? storedGenerated.filter(isGeneratedRecipe) : [];
        const validIds = new Set([...recipes.map(recipe => String(recipe.id)), ...validGenerated.map(recipe => String(recipe.id))]);
        const storedIds = idsValue ? JSON.parse(idsValue) : [];
        if (Array.isArray(storedIds)) setFavoriteIds(storedIds.map(String).filter(id => validIds.has(id)));
        setSavedGenerated(validGenerated);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setFavoritesReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!favoritesReady) return;
    Promise.all([
      AsyncStorage.setItem(favoritesKey, JSON.stringify(favoriteIds)),
      AsyncStorage.setItem(generatedFavoritesKey, JSON.stringify(savedGenerated)),
    ]).catch(() => {
      Alert.alert('Не удалось сохранить', 'Избранное останется до закрытия приложения. Попробуйте ещё раз.');
    });
  }, [favoriteIds, savedGenerated, favoritesReady]);

  useEffect(() => { void refreshUpdate(false); }, []);

  function openCatalog(query = '') {
    setOpened(false);
    setCatalogQuery(query);
    setScreen('catalog');
  }

  function selectProfile(value: Profile) {
    setProfile(value);
    if (value !== 'Все' && selected.profile !== value) setSelected(recipes.find(recipe => recipe.profile === value)!);
  }

  function toggleFavorite(recipe: Recipe) {
    const id = String(recipe.id);
    const removing = favoriteIds.includes(id);
    setFavoriteIds(current => removing ? current.filter(item => item !== id) : [...current, id]);
    if (recipe.generated) {
      setSavedGenerated(current => removing ? current.filter(item => String(item.id) !== id) :
        current.some(item => String(item.id) === id) ? current : [...current, recipe]);
    }
  }

  async function refreshUpdate(showResult: boolean) {
    setUpdateStatus('checking');
    try {
      const update = await fetchAvailableUpdate();
      setAvailableUpdate(update);
      setUpdateStatus(update ? 'available' : 'current');
      if (showResult && !update) Alert.alert('Обновлений нет', `Установлена актуальная версия ${APP_VERSION}.`);
    } catch {
      setUpdateStatus('error');
      if (showResult) Alert.alert('Не удалось проверить обновление', 'Проверьте подключение к интернету и попробуйте ещё раз.');
    }
  }

  function downloadUpdate() {
    if (!availableUpdate) return;
    Linking.openURL(availableUpdate.downloadUrl).catch(() => {
      Alert.alert('Не удалось открыть загрузку', 'Откройте страницу релиза на GitHub и скачайте APK вручную.');
    });
  }

  async function share() {
    try {
      await Share.share({ message: recipeText(selected), title: selected.name });
    } catch {
      Alert.alert('Не удалось поделиться', 'Попробуйте ещё раз или покажите карточку с экрана.');
    }
  }

  const selectedIsFavorite = favoriteIds.includes(String(selected.id));
  const authorRecipes = recipes.filter(recipe => recipe.source);
  const availableRecipes = [...recipes, ...savedGenerated.filter(saved => !recipes.some(recipe => recipe.id === saved.id))];
  const matches = availableRecipes.filter(recipe =>
    (profile === 'Все' || recipe.profile === profile) &&
    recipe.id !== selected.id &&
    (!showFavorites || favoriteIds.includes(String(recipe.id))) &&
    (!showAuthors || recipe.source)
  );

  function openAuthors() {
    const latest = authorRecipes[authorRecipes.length - 1];
    setProfile('Все');
    setShowFavorites(false);
    setShowAuthors(true);
    if (latest) setSelected(latest);
  }

  return <SafeAreaView style={s.safe}>
    <StatusBar style={opened ? 'dark' : 'light'} />
    {screen === 'catalog' ? <CatalogScreen initialQuery={catalogQuery} onClose={() => setScreen('mixes')} /> : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={s.header}>
        <View style={s.brandLockup}><View style={s.brandMark}><View style={s.brandMarkCore} /></View><Text style={s.logo}>mixroom</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={'Избранное, ' + favoriteIds.length} onPress={() => { setShowAuthors(false); setShowFavorites(value => !value); }} style={[s.savedBadge, showFavorites && s.savedBadgeActive]}>
          <Text style={[s.savedBadgeText, showFavorites && s.savedBadgeTextActive]}>{showFavorites ? '♥' : '♡'}  {favoriteIds.length}</Text>
        </Pressable>
      </View>

      {availableUpdate && <View style={s.updateBanner}>
        <View style={s.updateCopy}><Text style={s.updateEyebrow}>ДОСТУПНО ОБНОВЛЕНИЕ</Text><Text style={s.updateTitle}>Mixroom {availableUpdate.version}</Text><Text style={s.updateText}>Скачай новый APK и установи его поверх текущей версии.</Text></View>
        <Pressable accessibilityRole="link" onPress={downloadUpdate} style={s.updateDownload}><Text style={s.updateDownloadText}>Скачать ↓</Text></Pressable>
      </View>}

      <View style={s.hero}><Text style={s.eyebrow}>ПЕРСОНАЛЬНЫЙ МИКС</Text><Text style={s.title}>Какой вкус{'\n'}тебе хочется?</Text><Text style={s.subtitle}>Выбери настроение. Баланс нот и пропорции мы соберём сами.</Text></View>

      <View style={s.chips}>{profiles.map(item => <Pressable key={item} onPress={() => selectProfile(item)} accessibilityRole="button" accessibilityState={{ selected: profile === item }} style={[s.chip, profile === item && s.activeChip]}><Text style={[s.chipText, profile === item && s.activeText]}>{item}</Text></Pressable>)}</View>

      <View style={s.generatorPanel}>
        <View style={s.generatorTopline}><Text style={s.generatorTitle}>Настрой состав</Text><Text style={s.generatorMeta}>{catalog.length} вкусов</Text></View>
        <View style={s.generatorOptions}>
          <View style={s.generatorChoiceRow}>{([2, 3] as const).map(count => <Pressable key={count} accessibilityRole="button" accessibilityState={{ selected: generatorOptions.components === count }} onPress={() => setGeneratorOptions(current => ({ ...current, components: count }))} style={[s.generatorChoice, generatorOptions.components === count && s.generatorChoiceActive]}><Text style={[s.generatorChoiceText, generatorOptions.components === count && s.generatorChoiceTextActive]}>{count} ноты</Text></Pressable>)}</View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: generatorOptions.tngOnly }} onPress={() => setGeneratorOptions(current => ({ ...current, tngOnly: !current.tngOnly }))} style={[s.tngChoice, generatorOptions.tngOnly && s.tngChoiceActive]}><View style={[s.toggleDot, generatorOptions.tngOnly && s.toggleDotActive]} /><Text style={[s.tngChoiceText, generatorOptions.tngOnly && s.tngChoiceTextActive]}>Каталог TNG</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setSelected(generateRecipe(profile, generatorOptions, selected.id))} style={({ pressed }) => [s.primary, pressed && s.pressed]}><Text style={s.primaryIcon}>✦</Text><Text style={s.primaryText}>Собрать микс</Text><Text style={s.primaryArrow}>→</Text></Pressable>
      </View>

      <View style={[s.card, { borderColor: `${selected.color}55` }]} accessibilityLiveRegion="polite">
        <View pointerEvents="none" style={[s.cardGlow, { backgroundColor: selected.color }]} />
        <View style={s.row}><View style={[s.profileBadge, { backgroundColor: `${selected.color}22` }]}><View style={[s.profileDot, { backgroundColor: selected.color }]} /><Text style={[s.profileBadgeText, { color: selected.color }]}>{selected.profile}</Text></View><Text style={s.meta}>{selected.generated ? 'СОБРАНО ДЛЯ ТЕБЯ' : `РЕЦЕПТ ${String(selected.id).padStart(2, '0')}`}</Text></View>
        <Text style={s.recipeTitle}>{selected.name}</Text>
        <Text style={s.description}>{selected.description}</Text>
        <View style={s.bar}>{selected.ingredients.map(([name, percent], index) => <View key={name} style={{ flex: percent, backgroundColor: selected.color, opacity: 1 - index * .25 }} />)}</View>
        {selected.ingredients.map(([name, percent], index) => <View key={name} style={s.ingredient}><Text style={s.ingredientIndex}>{String(index + 1).padStart(2, '0')}</Text><Text style={s.ingredientName}>{name}</Text><Text style={s.percent}>{percent}</Text><Text style={s.percentMark}>%</Text></View>)}
        {selected.source && <Pressable accessibilityRole="link" onPress={() => Linking.openURL(selected.source!.url)} style={s.sourceCard}><View><Text style={s.sourceLabel}>РЕКОМЕНДАЦИЯ АВТОРА</Text><Text style={s.sourceAuthor}>{selected.source.author}</Text></View><Text style={s.sourceLink}>Оригинал ↗</Text></Pressable>}
        <View style={s.cardActions}>
          <Pressable accessibilityRole="button" style={[s.favoriteButton, selectedIsFavorite && s.favoriteButtonActive]} onPress={() => toggleFavorite(selected)}><Text style={[s.favoriteButtonText, selectedIsFavorite && s.favoriteButtonTextActive]}>{selectedIsFavorite ? '♥' : '♡'}</Text></Pressable>
          <Pressable accessibilityRole="button" style={[s.outlineButton, s.cardPrimaryAction]} onPress={() => setOpened(true)}><Text style={s.whiteButtonText}>Карточка для мастера</Text><Text style={s.buttonArrow}>↗</Text></Pressable>
        </View>
      </View>

      <Text style={s.hint}>Лучшие сочетания без повтора предыдущего микса</Text>

      <View style={s.discoveryRow}><Pressable accessibilityRole="button" onPress={openAuthors} style={s.discoveryCard}><Text style={s.discoveryIcon}>✦</Text><Text style={s.discoveryTitle}>От авторов</Text><Text style={s.discoveryText}>{authorRecipes.length} проверенных микса</Text><Text style={s.discoveryArrow}>↗</Text></Pressable><Pressable accessibilityRole="button" onPress={() => openCatalog()} style={[s.discoveryCard, s.discoveryCardAlt]}><Text style={s.discoveryNumber}>{catalog.length}</Text><Text style={s.discoveryTitle}>Палитра</Text><Text style={s.discoveryText}>Вкусы и марки</Text><Text style={s.discoveryArrow}>↗</Text></Pressable></View>

      <View style={s.section}>
        <View><Text style={s.sectionCaption}>{showFavorites ? 'ТВОЯ КОЛЛЕКЦИЯ' : showAuthors ? 'ПЕРВОИСТОЧНИКИ' : 'ВДОХНОВЕНИЕ'}</Text><Text style={s.sectionTitle}>{showFavorites ? 'Избранное' : showAuthors ? 'Миксы от авторов' : 'Ещё попробовать'}</Text></View>
        <View style={s.sectionToggleRow}>
          {(showFavorites || showAuthors) && <Pressable accessibilityRole="button" onPress={() => { setShowFavorites(false); setShowAuthors(false); }} style={s.sectionToggle}><Text style={s.sectionToggleText}>Все</Text></Pressable>}
          {!showFavorites && !showAuthors && <Pressable accessibilityRole="button" onPress={() => setShowFavorites(true)} style={s.sectionToggle}><Text style={s.sectionToggleText}>Избранное</Text></Pressable>}
        </View>
      </View>

      {showFavorites && matches.length === 0 ? <View style={s.emptySaved}><Text style={s.emptySavedIcon}>♡</Text><Text style={s.emptySavedTitle}>Пока ничего</Text><Text style={s.emptySavedText}>Сохрани удачный микс сердцем — он останется на этом устройстве.</Text></View> : matches.map(recipe => <View key={recipe.id} style={s.listItem}>
        <Pressable accessibilityRole="button" accessibilityLabel={'Открыть рецепт ' + recipe.name} onPress={() => { setSelected(recipe); setOpened(true); }} style={s.listMain}>
          <View style={[s.swatch, { backgroundColor: `${recipe.color}22`, borderColor: `${recipe.color}55` }]}><Text style={[s.swatchText, { color: recipe.color }]}>{recipe.generated ? '✦' : String(recipe.id).padStart(2, '0')}</Text></View>
          <View style={s.listCopy}><Text style={s.listTitle}>{recipe.name}</Text><Text style={s.listSub}>{recipe.ingredients.map(item => item[0]).join(' · ')}</Text></View>
          <Text style={s.arrow}>↗</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={(favoriteIds.includes(String(recipe.id)) ? 'Удалить из избранного: ' : 'Добавить в избранное: ') + recipe.name} onPress={() => toggleFavorite(recipe)} style={s.listFavorite}><Text style={s.listFavoriteText}>{favoriteIds.includes(String(recipe.id)) ? '♥' : '♡'}</Text></Pressable>
      </View>)}
      <View style={s.versionCard}>
        <View style={s.versionCopy}><Text style={s.versionTitle}>Mixroom {APP_VERSION}</Text><Text style={s.versionText}>{updateStatus === 'checking' ? 'Проверяем обновления…' : updateStatus === 'available' ? `Доступна версия ${availableUpdate?.version}` : updateStatus === 'error' ? 'Автопроверка недоступна' : 'Установлена актуальная версия'}</Text></View>
        <Pressable accessibilityRole="button" disabled={updateStatus === 'checking'} onPress={() => availableUpdate ? downloadUpdate() : refreshUpdate(true)} style={s.versionButton}><Text style={s.versionButtonText}>{availableUpdate ? 'Обновить' : 'Проверить'}</Text></Pressable>
      </View>
      <Text style={s.footer}>18+  ·  Вкусовой ориентир для мастера. Крепость и наличие уточняй в заведении.</Text>
    </ScrollView>}

    <Modal visible={opened} animationType="slide" onRequestClose={() => setOpened(false)}>
      <SafeAreaView style={s.recipeSafe}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sheet}>
        <View style={s.sheetHeader}><View style={s.sheetBrandLockup}><View style={s.sheetMark} /><Text style={s.sheetBrand}>mixroom</Text></View><Pressable accessibilityRole="button" onPress={() => setOpened(false)} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
        <View style={s.paperTopline}><Text style={s.paperEyebrow}>КАРТОЧКА ДЛЯ МАСТЕРА</Text><Pressable accessibilityRole="button" onPress={() => toggleFavorite(selected)} style={s.paperFavorite}><Text style={s.paperFavoriteText}>{selectedIsFavorite ? '♥ Сохранено' : '♡ Сохранить'}</Text></Pressable></View>
        <Text style={s.paperProfile}>{selected.profile}</Text><Text style={s.paperTitle}>{selected.name}</Text><Text style={s.paperDescription}>{selected.description}</Text>
        {selected.source && <Pressable accessibilityRole="link" onPress={() => Linking.openURL(selected.source!.url)} style={s.paperSource}><Text style={s.paperSourceLabel}>РЕКОМЕНДАЦИЯ НЕДЕЛИ</Text><Text style={s.paperSourceAuthor}>{selected.source.author}</Text><Text style={s.paperSourceLink}>{selected.source.title} ↗</Text></Pressable>}
        <View style={s.paperIngredients}>{selected.ingredients.map(([name, percent], index) => <Pressable accessibilityRole="button" accessibilityLabel={'Найти в палитре марок: ' + name} onPress={() => openCatalog(name)} key={name} style={s.paperRow}><Text style={s.paperIndex}>{String(index + 1).padStart(2, '0')}</Text><Text style={s.paperName}>{name}</Text><Text style={s.paperPercent}>{percent}<Text style={s.paperPercentMark}>%</Text></Text></Pressable>)}</View>
        <View style={s.paperNoteCard}><Text style={s.paperEyebrow}>КОММЕНТАРИЙ</Text><Text style={s.paperNote}>{selected.note}</Text></View>
        <Text style={s.paperHint}>Проценты показывают соотношение вкусов. Итоговую крепость и доступные аналоги согласуйте с мастером.</Text>
        <Pressable accessibilityRole="button" style={s.shareButton} onPress={share}><Text style={s.whiteButtonText}>Поделиться рецептом</Text><Text style={s.buttonArrow}>↗</Text></Pressable>
      </ScrollView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
