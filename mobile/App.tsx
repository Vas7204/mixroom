import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, SafeAreaView, ScrollView, Share, Text, View } from 'react-native';
import { CatalogScreen } from './CatalogScreen';
import { catalog } from './catalog';
import { generateRecipe, GeneratorOptions } from './generator';
import { Profile, profiles, Recipe, recipes, recipeText } from './recipes';
import { s } from './styles';
import { APP_VERSION, AppUpdate, fetchAvailableUpdate } from './updates';

const favoritesKey = 'mixroom:favorites:v1';
const generatedFavoritesKey = 'mixroom:generated-favorites:v1';

type Screen = 'mix' | 'saved' | 'catalog';
type CollectionMode = 'saved' | 'authors';

const profileInfo: Record<Profile, { label: string; icon: string; caption: string; color: string }> = {
  'Все': { label: 'Сюрприз', icon: '✦', caption: 'Доверься алгоритму', color: '#FF775C' },
  'Фруктовый': { label: 'Фрукты', icon: '◒', caption: 'Сочно и мягко', color: '#FF9B68' },
  'Ягодный': { label: 'Ягоды', icon: '●', caption: 'Глубоко и ярко', color: '#E76F9E' },
  'Цитрусовый': { label: 'Цитрусы', icon: '◐', caption: 'Кисло и звонко', color: '#FFD166' },
  'Десертный': { label: 'Десерт', icon: '◆', caption: 'Сладко и плотно', color: '#C7A6FF' },
  'Свежий': { label: 'Свежесть', icon: '≈', caption: 'Чисто и прохладно', color: '#6ED6C1' },
};

function isGeneratedRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') return false;
  const recipe = value as Partial<Recipe>;
  return typeof recipe.id === 'string' && recipe.id.startsWith('generated:') &&
    typeof recipe.name === 'string' && Array.isArray(recipe.ingredients) &&
    Boolean(recipe.generated?.catalogIds?.length);
}

function MixroomLogo() {
  return <View style={s.logoLockup}>
    <View style={s.logoTile}><View style={s.logoCutout} /><View style={s.logoDot} /></View>
    <View><Text style={s.logo}>MIXROOM</Text><Text style={s.logoCaption}>FLAVOUR LAB</Text></View>
  </View>;
}

function RecipeListCard({ recipe, favorite, onOpen, onFavorite }: {
  recipe: Recipe;
  favorite: boolean;
  onOpen: () => void;
  onFavorite: () => void;
}) {
  return <View style={s.recipeListCard}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Открыть рецепт ${recipe.name}`} onPress={onOpen} style={s.recipeListMain}>
      <View style={[s.recipeListArt, { backgroundColor: `${recipe.color}22` }]}>
        <View style={[s.recipeListOrb, { backgroundColor: recipe.color }]} />
        <Text style={[s.recipeListArtText, { color: recipe.color }]}>{recipe.generated ? 'AI' : String(recipe.id).padStart(2, '0')}</Text>
      </View>
      <View style={s.recipeListCopy}>
        <Text style={s.recipeListProfile}>{recipe.profile.toUpperCase()}</Text>
        <Text style={s.recipeListTitle} numberOfLines={2}>{recipe.name}</Text>
        <Text style={s.recipeListNotes} numberOfLines={1}>{recipe.ingredients.map(item => item[0]).join('  ·  ')}</Text>
      </View>
      <Text style={s.recipeListArrow}>›</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={favorite ? 'Удалить из сохранённых' : 'Сохранить рецепт'} onPress={onFavorite} style={s.recipeListFavorite}>
      <Text style={[s.recipeListFavoriteText, favorite && s.recipeListFavoriteTextActive]}>{favorite ? '♥' : '♡'}</Text>
    </Pressable>
  </View>;
}

function BottomNavigation({ screen, savedCount, onSelect }: { screen: Screen; savedCount: number; onSelect: (screen: Screen) => void }) {
  const items: { id: Screen; icon: string; label: string }[] = [
    { id: 'mix', icon: '✦', label: 'Микс' },
    { id: 'saved', icon: savedCount ? '♥' : '♡', label: 'Коллекция' },
    { id: 'catalog', icon: '▦', label: 'Палитра' },
  ];
  return <View style={s.navWrap}><View style={s.nav}>
    {items.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: screen === item.id }} onPress={() => onSelect(item.id)} style={[s.navItem, screen === item.id && s.navItemActive]}>
      <View style={s.navIconWrap}><Text style={[s.navIcon, screen === item.id && s.navIconActive]}>{item.icon}</Text>{item.id === 'saved' && savedCount > 0 && <View style={s.navCount}><Text style={s.navCountText}>{savedCount}</Text></View>}</View>
      <Text style={[s.navLabel, screen === item.id && s.navLabelActive]}>{item.label}</Text>
    </Pressable>)}
  </View></View>;
}

export default function App() {
  const [profile, setProfile] = useState<Profile>('Все');
  const [selected, setSelected] = useState<Recipe>(recipes[0]);
  const [opened, setOpened] = useState(false);
  const [screen, setScreen] = useState<Screen>('mix');
  const [collectionMode, setCollectionMode] = useState<CollectionMode>('saved');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [savedGenerated, setSavedGenerated] = useState<Recipe[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [generatorOptions, setGeneratorOptions] = useState<GeneratorOptions>({ components: 3, tngOnly: false });
  const [updateStatus, setUpdateStatus] = useState<'checking' | 'current' | 'available' | 'error'>('checking');
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(null);
  const mixScroll = useRef<ScrollView>(null);
  const resultPosition = useRef(0);

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
    ]).catch(() => Alert.alert('Не удалось сохранить', 'Коллекция останется до закрытия приложения. Попробуйте ещё раз.'));
  }, [favoriteIds, savedGenerated, favoritesReady]);

  useEffect(() => { void refreshUpdate(false); }, []);

  const availableRecipes = useMemo(() => [...recipes, ...savedGenerated.filter(saved => !recipes.some(recipe => recipe.id === saved.id))], [savedGenerated]);
  const authorRecipes = useMemo(() => recipes.filter(recipe => recipe.source), []);
  const savedRecipes = useMemo(() => availableRecipes.filter(recipe => favoriteIds.includes(String(recipe.id))), [availableRecipes, favoriteIds]);
  const recommendations = useMemo(() => availableRecipes.filter(recipe => recipe.id !== selected.id && (profile === 'Все' || recipe.profile === profile)).slice(0, 6), [availableRecipes, profile, selected.id]);
  const selectedIsFavorite = favoriteIds.includes(String(selected.id));

  function openCatalog(query = '') {
    setOpened(false);
    setCatalogQuery(query);
    setScreen('catalog');
  }

  function selectProfile(value: Profile) {
    setProfile(value);
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

  function createMix() {
    setSelected(generateRecipe(profile, generatorOptions, selected.id));
    setTimeout(() => mixScroll.current?.scrollTo({ y: Math.max(0, resultPosition.current - 18), animated: true }), 80);
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
    Linking.openURL(availableUpdate.downloadUrl).catch(() => Alert.alert('Не удалось открыть загрузку', 'Откройте страницу релиза на GitHub и скачайте APK вручную.'));
  }

  async function share() {
    try {
      await Share.share({ message: recipeText(selected), title: selected.name });
    } catch {
      Alert.alert('Не удалось поделиться', 'Попробуйте ещё раз или покажите карточку с экрана.');
    }
  }

  function openRecipe(recipe: Recipe) {
    setSelected(recipe);
    setOpened(true);
  }

  const home = <ScrollView ref={mixScroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.page}>
    <View style={s.topbar}>
      <MixroomLogo />
      <Pressable accessibilityRole="button" accessibilityLabel={`Открыть коллекцию, ${favoriteIds.length}`} onPress={() => setScreen('saved')} style={s.topbarButton}>
        <Text style={s.topbarHeart}>{favoriteIds.length ? '♥' : '♡'}</Text><Text style={s.topbarCount}>{favoriteIds.length}</Text>
      </Pressable>
    </View>

    {availableUpdate && <Pressable accessibilityRole="link" onPress={downloadUpdate} style={s.updateStrip}>
      <View style={s.updatePulse} /><Text style={s.updateStripText}>Доступна версия {availableUpdate.version}</Text><Text style={s.updateStripLink}>Скачать  ↗</Text>
    </Pressable>}

    <View style={s.heroBlock}>
      <Text style={s.heroKicker}>ТВОЙ ВКУС · ТВОИ ПРАВИЛА</Text>
      <Text style={s.heroTitle}>Соберём{`\n`}чашу?</Text>
      <Text style={s.heroText}>Выбери настроение, а мы найдём сочетание среди {catalog.length} вкусов и рассчитаем пропорции.</Text>
    </View>

    <View style={s.stepHeader}><Text style={s.stepNumber}>01</Text><View style={s.stepRule} /><Text style={s.stepTitle}>НАСТРОЕНИЕ</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.profileRail}>
      {profiles.map(item => {
        const info = profileInfo[item];
        const active = profile === item;
        return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => selectProfile(item)} style={[s.profileCard, active && { backgroundColor: info.color, borderColor: info.color }]}>
          <Text style={[s.profileIcon, active && s.profileIconActive]}>{info.icon}</Text>
          <Text style={[s.profileLabel, active && s.profileLabelActive]}>{info.label}</Text>
          <Text style={[s.profileCaption, active && s.profileCaptionActive]}>{info.caption}</Text>
        </Pressable>;
      })}
    </ScrollView>

    <View style={s.stepHeader}><Text style={s.stepNumber}>02</Text><View style={s.stepRule} /><Text style={s.stepTitle}>ФОРМУЛА</Text></View>
    <View style={s.labCard}>
      <View style={s.labDecorOne} /><View style={s.labDecorTwo} />
      <View style={s.labTop}>
        <View><Text style={s.labEyebrow}>MIX LAB</Text><Text style={s.labTitle}>Настрой состав</Text></View>
        <View style={s.labBadge}><Text style={s.labBadgeText}>{generatorOptions.tngOnly ? 'TNG ONLY' : 'FULL CATALOG'}</Text></View>
      </View>
      <View style={s.flavourStack}>
        {Array.from({ length: generatorOptions.components }).map((_, index) => <View key={index} style={[s.flavourLayer, { width: `${100 - index * 16}%`, backgroundColor: index === 0 ? profileInfo[profile].color : index === 1 ? '#B79CFF' : '#FFE7D9' }]}><Text style={[s.flavourLayerText, index === 2 && s.flavourLayerTextDark]}>{index === 0 ? 'ОСНОВА' : index === 1 ? 'ПОДДЕРЖКА' : 'АКЦЕНТ'}</Text></View>)}
      </View>
      <View style={s.labControl}>
        <View><Text style={s.controlLabel}>КОЛИЧЕСТВО НОТ</Text><Text style={s.controlHint}>Чем меньше, тем понятнее вкус</Text></View>
        <View style={s.segment}>{([2, 3] as const).map(count => <Pressable key={count} accessibilityRole="button" accessibilityState={{ selected: generatorOptions.components === count }} onPress={() => setGeneratorOptions(current => ({ ...current, components: count }))} style={[s.segmentButton, generatorOptions.components === count && s.segmentButtonActive]}><Text style={[s.segmentText, generatorOptions.components === count && s.segmentTextActive]}>{count}</Text></Pressable>)}</View>
      </View>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: generatorOptions.tngOnly }} onPress={() => setGeneratorOptions(current => ({ ...current, tngOnly: !current.tngOnly }))} style={s.switchRow}>
        <View><Text style={s.controlLabel}>ТОЛЬКО МАРКИ TNG</Text><Text style={s.controlHint}>Tangiers, Bonche, Dogma и другие</Text></View>
        <View style={[s.switchTrack, generatorOptions.tngOnly && s.switchTrackActive]}><View style={[s.switchThumb, generatorOptions.tngOnly && s.switchThumbActive]} /></View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={createMix} style={({ pressed }) => [s.generateButton, pressed && s.pressed]}>
        <Text style={s.generateSpark}>✦</Text><Text style={s.generateText}>Собрать новый микс</Text><Text style={s.generateArrow}>→</Text>
      </Pressable>
    </View>

    <View onLayout={event => { resultPosition.current = event.nativeEvent.layout.y; }} style={s.resultSection}>
      <View style={s.stepHeader}><Text style={s.stepNumber}>03</Text><View style={s.stepRule} /><Text style={s.stepTitle}>РЕЗУЛЬТАТ</Text></View>
      <View style={[s.resultCard, { borderColor: `${selected.color}55` }]} accessibilityLiveRegion="polite">
        <View style={[s.resultHalo, { backgroundColor: selected.color }]} />
        <View style={s.resultTop}>
          <View style={[s.resultProfile, { backgroundColor: `${selected.color}25` }]}><View style={[s.resultDot, { backgroundColor: selected.color }]} /><Text style={[s.resultProfileText, { color: selected.color }]}>{selected.profile}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={selectedIsFavorite ? 'Удалить из сохранённых' : 'Сохранить рецепт'} onPress={() => toggleFavorite(selected)} style={[s.resultFavorite, selectedIsFavorite && s.resultFavoriteActive]}><Text style={[s.resultFavoriteText, selectedIsFavorite && s.resultFavoriteTextActive]}>{selectedIsFavorite ? '♥' : '♡'}</Text></Pressable>
        </View>
        <Text style={s.resultTitle}>{selected.name}</Text>
        <Text style={s.resultDescription}>{selected.description}</Text>
        <View style={s.recipeFormula}>
          {selected.ingredients.map(([name, percent], index) => <View key={name} style={s.formulaRow}>
            <View style={s.formulaTop}><View style={s.formulaNameWrap}><Text style={s.formulaIndex}>{String(index + 1).padStart(2, '0')}</Text><Text style={s.formulaName}>{name}</Text></View><Text style={s.formulaPercent}>{percent}<Text style={s.formulaPercentMark}>%</Text></Text></View>
            <View style={s.formulaTrack}><View style={[s.formulaFill, { width: `${percent}%`, backgroundColor: selected.color, opacity: 1 - index * .2 }]} /></View>
          </View>)}
        </View>
        {selected.source && <Pressable accessibilityRole="link" onPress={() => Linking.openURL(selected.source!.url)} style={s.authorChip}><Text style={s.authorChipIcon}>✦</Text><View style={s.authorChipCopy}><Text style={s.authorChipLabel}>РЕЦЕПТ ОТ АВТОРА</Text><Text style={s.authorChipName}>{selected.source.author}</Text></View><Text style={s.authorChipArrow}>↗</Text></Pressable>}
        <Pressable accessibilityRole="button" onPress={() => setOpened(true)} style={s.masterButton}><Text style={s.masterButtonText}>Открыть рецепт для мастера</Text><Text style={s.masterButtonArrow}>↗</Text></Pressable>
      </View>
    </View>

    <View style={s.editorialHeader}><View><Text style={s.editorialKicker}>ЕЩЁ ПОПРОБОВАТЬ</Text><Text style={s.editorialTitle}>В том же настроении</Text></View><Pressable onPress={() => { setCollectionMode('authors'); setScreen('saved'); }}><Text style={s.editorialLink}>Все рецепты</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recommendationRail}>
      {recommendations.map(recipe => <Pressable key={recipe.id} accessibilityRole="button" onPress={() => openRecipe(recipe)} style={s.recommendationCard}>
        <View style={[s.recommendationVisual, { backgroundColor: `${recipe.color}26` }]}><View style={[s.recommendationDisc, { borderColor: recipe.color }]}><View style={[s.recommendationDiscCore, { backgroundColor: recipe.color }]} /></View><Text style={[s.recommendationNumber, { color: recipe.color }]}>{recipe.generated ? 'AI' : String(recipe.id).padStart(2, '0')}</Text></View>
        <Text style={s.recommendationProfile}>{recipe.profile.toUpperCase()}</Text><Text style={s.recommendationTitle} numberOfLines={2}>{recipe.name}</Text><Text style={s.recommendationMeta}>{recipe.ingredients.length} ноты  ·  открыть ↗</Text>
      </Pressable>)}
    </ScrollView>
    <Text style={s.legal}>18+ · Mixroom помогает сформулировать вкус. Крепость, забивку и наличие продуктов согласуйте с мастером.</Text>
  </ScrollView>;

  const collectionItems = collectionMode === 'saved' ? savedRecipes : authorRecipes;
  const collection = <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.page}>
    <View style={s.topbar}><MixroomLogo /><View style={s.collectionCountBadge}><Text style={s.collectionCountNumber}>{collectionItems.length}</Text></View></View>
    <Text style={s.screenKicker}>ТВОЯ БИБЛИОТЕКА</Text><Text style={s.screenTitle}>Коллекция</Text><Text style={s.screenSubtitle}>Сохраняй удачные сочетания и возвращайся к рекомендациям авторов.</Text>
    <View style={s.collectionTabs}>
      {(['saved', 'authors'] as CollectionMode[]).map(mode => <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected: collectionMode === mode }} onPress={() => setCollectionMode(mode)} style={[s.collectionTab, collectionMode === mode && s.collectionTabActive]}><Text style={[s.collectionTabText, collectionMode === mode && s.collectionTabTextActive]}>{mode === 'saved' ? `Сохранено · ${savedRecipes.length}` : `От авторов · ${authorRecipes.length}`}</Text></Pressable>)}
    </View>
    {collectionItems.length === 0 ? <View style={s.emptyCollection}>
      <View style={s.emptyCollectionIcon}><Text style={s.emptyCollectionIconText}>♡</Text></View><Text style={s.emptyCollectionTitle}>Здесь пока пусто</Text><Text style={s.emptyCollectionText}>Нажимай на сердце в карточке микса — рецепт останется на этом устройстве.</Text><Pressable onPress={() => setScreen('mix')} style={s.emptyCollectionButton}><Text style={s.emptyCollectionButtonText}>Собрать первый микс</Text></Pressable>
    </View> : <View style={s.collectionList}>{collectionItems.map(recipe => <RecipeListCard key={recipe.id} recipe={recipe} favorite={favoriteIds.includes(String(recipe.id))} onOpen={() => openRecipe(recipe)} onFavorite={() => toggleFavorite(recipe)} />)}</View>}
    <View style={s.systemCard}>
      <View style={s.systemIcon}><Text style={s.systemIconText}>{updateStatus === 'current' ? '✓' : updateStatus === 'available' ? '↓' : '·'}</Text></View>
      <View style={s.systemCopy}><Text style={s.systemTitle}>Mixroom {APP_VERSION}</Text><Text style={s.systemText}>{updateStatus === 'checking' ? 'Проверяем обновления…' : updateStatus === 'available' ? `Доступна версия ${availableUpdate?.version}` : updateStatus === 'error' ? 'Не удалось проверить автоматически' : 'Установлена актуальная версия'}</Text></View>
      <Pressable accessibilityRole="button" disabled={updateStatus === 'checking'} onPress={() => availableUpdate ? downloadUpdate() : refreshUpdate(true)} style={s.systemAction}><Text style={s.systemActionText}>{availableUpdate ? 'Обновить' : 'Проверить'}</Text></Pressable>
    </View>
  </ScrollView>;

  return <SafeAreaView style={s.safe}>
    <StatusBar style="light" />
    <View style={s.appBody}>
      {screen === 'mix' ? home : screen === 'saved' ? collection : <CatalogScreen initialQuery={catalogQuery} />}
    </View>
    <BottomNavigation screen={screen} savedCount={favoriteIds.length} onSelect={next => { if (next !== 'catalog') setCatalogQuery(''); setScreen(next); }} />

    <Modal visible={opened} animationType="slide" onRequestClose={() => setOpened(false)}>
      <SafeAreaView style={s.modalSafe}>
        <StatusBar style="light" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.recipeSheet}>
          <View style={s.modalHeader}><MixroomLogo /><Pressable accessibilityRole="button" accessibilityLabel="Закрыть рецепт" onPress={() => setOpened(false)} style={s.modalClose}><Text style={s.modalCloseText}>×</Text></Pressable></View>
          <View style={s.recipePassport}>
            <View style={[s.passportAccent, { backgroundColor: selected.color }]} />
            <View style={s.passportTop}><View><Text style={s.passportKicker}>ПАСПОРТ МИКСА</Text><Text style={s.passportCode}>MR · {selected.generated ? 'CUSTOM' : String(selected.id).padStart(3, '0')}</Text></View><View style={[s.passportSeal, { borderColor: selected.color }]}><Text style={[s.passportSealText, { color: selected.color }]}>{profileInfo[selected.profile].icon}</Text></View></View>
            <Text style={[s.passportProfile, { color: selected.color }]}>{selected.profile.toUpperCase()}</Text><Text style={s.passportTitle}>{selected.name}</Text><Text style={s.passportDescription}>{selected.description}</Text>
            <View style={s.passportDivider}><View style={s.passportNotchLeft} /><View style={s.passportDash} /><View style={s.passportNotchRight} /></View>
            <Text style={s.passportSectionTitle}>СОСТАВ ЧАШИ</Text>
            <View style={s.passportIngredients}>{selected.ingredients.map(([name, percent], index) => <Pressable accessibilityRole="button" accessibilityLabel={`Найти в палитре ${name}`} onPress={() => openCatalog(name)} key={name} style={s.passportRow}>
              <View style={[s.passportIngredientNumber, { backgroundColor: `${selected.color}24` }]}><Text style={[s.passportIngredientNumberText, { color: selected.color }]}>{index + 1}</Text></View><Text style={s.passportIngredientName}>{name}</Text><View style={s.passportPercent}><Text style={s.passportPercentValue}>{percent}</Text><Text style={s.passportPercentMark}>%</Text></View>
            </Pressable>)}</View>
            <View style={s.masterNote}><Text style={s.masterNoteLabel}>КОММЕНТАРИЙ МАСТЕРУ</Text><Text style={s.masterNoteText}>{selected.note}</Text></View>
            {selected.source && <Pressable accessibilityRole="link" onPress={() => Linking.openURL(selected.source!.url)} style={s.passportSource}><Text style={s.passportSourceLabel}>ИСТОЧНИК</Text><Text style={s.passportSourceTitle}>{selected.source.author}</Text><Text style={s.passportSourceLink}>{selected.source.title}  ↗</Text></Pressable>}
          </View>
          <View style={s.modalActions}>
            <Pressable accessibilityRole="button" onPress={() => toggleFavorite(selected)} style={[s.modalSave, selectedIsFavorite && s.modalSaveActive]}><Text style={[s.modalSaveText, selectedIsFavorite && s.modalSaveTextActive]}>{selectedIsFavorite ? '♥  Сохранено' : '♡  Сохранить'}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={share} style={s.modalShare}><Text style={s.modalShareText}>Поделиться</Text><Text style={s.modalShareArrow}>↗</Text></Pressable>
          </View>
          <Text style={s.modalHint}>Проценты показывают соотношение ароматик. Крепость и способ забивки мастер подбирает отдельно.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
