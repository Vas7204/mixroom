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
    {screen === 'catalog' ? <CatalogScreen initialQuery={catalogQuery} onClose={() => setScreen('mixes')} /> : <ScrollView contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.logo}>mixroom<Text style={s.logoMark}> ◌</Text></Text>
        <Pressable accessibilityRole="button" accessibilityLabel={'Избранное, ' + favoriteIds.length} onPress={() => { setShowAuthors(false); setShowFavorites(value => !value); }} style={[s.savedBadge, showFavorites && s.savedBadgeActive]}>
          <Text style={[s.savedBadgeText, showFavorites && s.savedBadgeTextActive]}>★ {favoriteIds.length}</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => openCatalog()} style={s.catalogLink}>
        <Text style={s.catalogLinkText}>Палитра марок</Text><Text style={s.catalogLinkMeta}>{catalog.length} вкусов ↗</Text>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={openAuthors} style={s.authorHub}>
        <View style={s.authorHubMark}><Text style={s.authorHubMarkText}>✦</Text></View>
        <View style={s.authorHubCopy}><Text style={s.authorHubEyebrow}>ПРОВЕРЕННЫЕ ПЕРВОИСТОЧНИКИ</Text><Text style={s.authorHubTitle}>Миксы от авторов</Text><Text style={s.authorHubText}>{authorRecipes.length} рекомендации · новые каждую неделю</Text></View>
        <Text style={s.authorHubArrow}>↗</Text>
      </Pressable>

      {availableUpdate && <View style={s.updateBanner}>
        <View style={s.updateCopy}><Text style={s.updateEyebrow}>ДОСТУПНО ОБНОВЛЕНИЕ</Text><Text style={s.updateTitle}>Mixroom {availableUpdate.version}</Text><Text style={s.updateText}>Скачай новый APK и установи его поверх текущей версии.</Text></View>
        <Pressable accessibilityRole="link" onPress={downloadUpdate} style={s.updateDownload}><Text style={s.updateDownloadText}>Скачать ↓</Text></Pressable>
      </View>}

      <Text style={s.eyebrow}>ТВОЙ СЛЕДУЮЩИЙ МИКС</Text>
      <Text style={s.title}>Что сегодня{'\n'}по вкусу?</Text>
      <Text style={s.subtitle}>Выбери направление — получишь готовые пропорции для мастера.</Text>
      <View style={s.stats}>
        <View><Text style={s.statValue}>{catalog.length}</Text><Text style={s.statLabel}>вкусов</Text></View>
        <View style={s.statDivider} />
        <View><Text style={s.statValue}>{profiles.length - 1}</Text><Text style={s.statLabel}>направлений</Text></View>
        <View style={s.statDivider} />
        <View><Text style={s.statValue}>∞</Text><Text style={s.statLabel}>офлайн</Text></View>
      </View>

      <View style={s.chips}>{profiles.map(item => <Pressable key={item} onPress={() => selectProfile(item)} accessibilityRole="button" accessibilityState={{ selected: profile === item }} style={[s.chip, profile === item && s.activeChip]}><Text style={[s.chipText, profile === item && s.activeText]}>{item}</Text></Pressable>)}</View>

      <View style={[s.card, { borderColor: selected.color }]} accessibilityLiveRegion="polite">
        <View style={s.row}><Text style={[s.eyebrow, { color: selected.color }]}>{selected.profile.toUpperCase()}</Text><Text style={s.meta}>{selected.generated ? 'СГЕНЕРИРОВАНО ИЗ КАТАЛОГА' : `МИКС / ${String(selected.id).padStart(2, '0')}`}</Text></View>
        {selected.source && <Pressable accessibilityRole="link" onPress={() => Linking.openURL(selected.source!.url)} style={s.sourceCard}><Text style={s.sourceLabel}>МИКС НЕДЕЛИ</Text><Text style={s.sourceAuthor}>{selected.source.author}</Text><Text style={s.sourceLink}>Открыть оригинал ↗</Text></Pressable>}
        <Text style={s.recipeTitle}>{selected.name}</Text>
        <Text style={s.description}>{selected.description}</Text>
        <View style={s.bar}>{selected.ingredients.map(([name, percent], index) => <View key={name} style={{ flex: percent, backgroundColor: selected.color, opacity: 1 - index * .25 }} />)}</View>
        {selected.ingredients.map(([name, percent], index) => <View key={name} style={s.ingredient}><View style={[s.dot, { backgroundColor: selected.color, opacity: 1 - index * .25 }]} /><Text style={s.ingredientName}>{name}</Text><Text style={s.percent}>{percent}%</Text></View>)}
        <View style={s.cardActions}>
          <Pressable accessibilityRole="button" style={s.favoriteButton} onPress={() => toggleFavorite(selected)}><Text style={s.favoriteButtonText}>{selectedIsFavorite ? '★' : '☆'}</Text></Pressable>
          <Pressable accessibilityRole="button" style={[s.outlineButton, s.cardPrimaryAction]} onPress={() => setOpened(true)}><Text style={s.whiteButtonText}>Показать мастеру ↗</Text></Pressable>
        </View>
      </View>

      <View style={s.generatorOptions}>
        <View style={s.generatorGroup}><Text style={s.generatorLabel}>СОСТАВ</Text><View style={s.generatorChoiceRow}>{([2, 3] as const).map(count => <Pressable key={count} accessibilityRole="button" accessibilityState={{ selected: generatorOptions.components === count }} onPress={() => setGeneratorOptions(current => ({ ...current, components: count }))} style={[s.generatorChoice, generatorOptions.components === count && s.generatorChoiceActive]}><Text style={[s.generatorChoiceText, generatorOptions.components === count && s.generatorChoiceTextActive]}>{count} вкуса</Text></Pressable>)}</View></View>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: generatorOptions.tngOnly }} onPress={() => setGeneratorOptions(current => ({ ...current, tngOnly: !current.tngOnly }))} style={[s.tngChoice, generatorOptions.tngOnly && s.tngChoiceActive]}><Text style={[s.tngChoiceText, generatorOptions.tngOnly && s.tngChoiceTextActive]}>{generatorOptions.tngOnly ? '✓ ' : ''}Только TNG</Text></Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={() => setSelected(generateRecipe(profile, generatorOptions, selected.id))} style={({ pressed }) => [s.primary, pressed && s.pressed]}><Text style={s.primaryText}>✦  Собрать новый микс</Text></Pressable>
      <Text style={s.hint}>Из {catalog.length} вкусов по совместимости нот, без повтора предыдущего</Text>

      <View style={s.section}>
        <View><Text style={s.sectionTitle}>{showFavorites ? 'Избранные миксы' : showAuthors ? 'Миксы от авторов' : 'Ещё по вкусу'}</Text><Text style={s.sectionCaption}>{showFavorites ? 'Сохраняются на этом устройстве' : showAuthors ? 'С прямыми ссылками на публикации' : matches.length + ' вариантов'}</Text></View>
        <View style={s.sectionToggleRow}>
          {(showFavorites || showAuthors) && <Pressable accessibilityRole="button" onPress={() => { setShowFavorites(false); setShowAuthors(false); }} style={s.sectionToggle}><Text style={s.sectionToggleText}>Все</Text></Pressable>}
          {!showFavorites && !showAuthors && <Pressable accessibilityRole="button" onPress={() => setShowFavorites(true)} style={s.sectionToggle}><Text style={s.sectionToggleText}>★ Избранное</Text></Pressable>}
        </View>
      </View>

      {showFavorites && matches.length === 0 ? <View style={s.emptySaved}><Text style={s.emptySavedIcon}>☆</Text><Text style={s.emptySavedTitle}>Здесь пока пусто</Text><Text style={s.emptySavedText}>Нажми на звезду в карточке микса — он сохранится на этом устройстве.</Text></View> : matches.map(recipe => <View key={recipe.id} style={s.listItem}>
        <Pressable accessibilityRole="button" accessibilityLabel={'Открыть рецепт ' + recipe.name} onPress={() => { setSelected(recipe); setOpened(true); }} style={s.listMain}>
          <View style={[s.swatch, { backgroundColor: recipe.color }]}><Text style={s.swatchText}>{recipe.generated ? '✦' : String(recipe.id).padStart(2, '0')}</Text></View>
          <View style={s.listCopy}><Text style={s.listTitle}>{recipe.name}</Text><Text style={s.listSub}>{recipe.ingredients.map(item => item[0]).join(' · ')}</Text></View>
          <Text style={s.arrow}>↗</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={(favoriteIds.includes(String(recipe.id)) ? 'Удалить из избранного: ' : 'Добавить в избранное: ') + recipe.name} onPress={() => toggleFavorite(recipe)} style={s.listFavorite}><Text style={s.listFavoriteText}>{favoriteIds.includes(String(recipe.id)) ? '★' : '☆'}</Text></Pressable>
      </View>)}
      <View style={s.versionCard}>
        <View style={s.versionCopy}><Text style={s.versionTitle}>Mixroom {APP_VERSION}</Text><Text style={s.versionText}>{updateStatus === 'checking' ? 'Проверяем обновления…' : updateStatus === 'available' ? `Доступна версия ${availableUpdate?.version}` : updateStatus === 'error' ? 'Автопроверка недоступна' : 'Установлена актуальная версия'}</Text></View>
        <Pressable accessibilityRole="button" disabled={updateStatus === 'checking'} onPress={() => availableUpdate ? downloadUpdate() : refreshUpdate(true)} style={s.versionButton}><Text style={s.versionButtonText}>{availableUpdate ? 'Обновить' : 'Проверить'}</Text></Pressable>
      </View>
      <Text style={s.footer}>Вкусовые идеи, а не проверенные рецептуры. Бренды, крепость и пропорции уточняй у мастера.</Text>
    </ScrollView>}

    <Modal visible={opened} animationType="slide" onRequestClose={() => setOpened(false)}>
      <SafeAreaView style={s.recipeSafe}><ScrollView contentContainerStyle={s.sheet}>
        <View style={s.header}><Text style={s.sheetBrand}>mixroom / рецепт</Text><Pressable accessibilityRole="button" onPress={() => setOpened(false)} style={s.close}><Text style={s.closeText}>Закрыть ×</Text></Pressable></View>
        <View style={s.paperTopline}><Text style={s.paperEyebrow}>ДЛЯ КАЛЬЯННОГО МАСТЕРА</Text><Pressable accessibilityRole="button" onPress={() => toggleFavorite(selected)} style={s.paperFavorite}><Text style={s.paperFavoriteText}>{selectedIsFavorite ? '★ В избранном' : '☆ Сохранить'}</Text></Pressable></View>
        <Text style={s.paperTitle}>{selected.name}</Text><Text style={s.paperDescription}>{selected.description}</Text>
        {selected.source && <Pressable accessibilityRole="link" onPress={() => Linking.openURL(selected.source!.url)} style={s.paperSource}><Text style={s.paperSourceLabel}>РЕКОМЕНДАЦИЯ НЕДЕЛИ</Text><Text style={s.paperSourceAuthor}>{selected.source.author}</Text><Text style={s.paperSourceLink}>{selected.source.title} ↗</Text></Pressable>}
        <View style={s.paperIngredients}>{selected.ingredients.map(([name, percent]) => <Pressable accessibilityRole="button" accessibilityLabel={'Найти в палитре марок: ' + name} onPress={() => openCatalog(name)} key={name} style={s.paperRow}><Text style={s.paperName}>{name} ↗</Text><Text style={s.paperPercent}>{percent}%</Text></Pressable>)}</View>
        <Text style={s.paperEyebrow}>ПОЖЕЛАНИЕ</Text><Text style={s.paperNote}>{selected.note}</Text>
        <Text style={s.paperHint}>Проценты — ориентир по составу микса. Подберите доступные аналоги и согласуйте крепость отдельно. Интенсивность зависит от бренда.</Text>
        <Pressable accessibilityRole="button" style={s.shareButton} onPress={share}><Text style={s.whiteButtonText}>Поделиться рецептом</Text></Pressable>
      </ScrollView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
