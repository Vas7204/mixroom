import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Brand, brands, CatalogProduct, catalogCheckedAt, searchCatalog, TobaccoBrand } from './catalog';

const brandColors: Record<TobaccoBrand, string> = {
  'DARKSIDE': '#8E7CFF',
  'MUSTHAVE': '#FF775C',
  'Tangiers': '#D49AFF',
  "Trofimoff's": '#6ED6C1',
  'Bonche': '#FFB56B',
  'Dogma': '#E76F9E',
  'BLANSH': '#F4E9E1',
  'Azure': '#6EB7FF',
};

export function CatalogScreen({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [brand, setBrand] = useState<Brand>('Все марки');
  const [selected, setSelected] = useState<CatalogProduct | null>(null);
  const results = useMemo(() => searchCatalog(query, brand), [query, brand]);

  return <View style={c.root}>
    <View style={c.pageHeader}>
      <View><Text style={c.kicker}>530 ПОЗИЦИЙ · 8 МАРОК</Text><Text style={c.title}>Палитра</Text></View>
      <View style={c.resultBadge}><Text style={c.resultBadgeNumber}>{results.length}</Text><Text style={c.resultBadgeLabel}>НАЙДЕНО</Text></View>
    </View>
    <Text style={c.subtitle}>Найди конкретный вкус или исследуй ассортимент, который используют российские кальянные.</Text>
    <View style={c.searchWrap}>
      <View style={c.searchMark}><Text style={c.searchMarkText}>⌕</Text></View>
      <TextInput accessibilityLabel="Поиск вкуса, ноты или марки" autoCorrect={false} value={query} onChangeText={setQuery} placeholder="Вкус, нота или марка" placeholderTextColor="#766B7A" style={c.search} />
      {query.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Очистить поиск" onPress={() => setQuery('')} style={c.clearButton}><Text style={c.clear}>×</Text></Pressable>}
    </View>
    <View style={c.brandScroller}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={c.brandRail}>
      {brands.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: brand === item }} onPress={() => setBrand(item)} style={[c.brandChip, brand === item && c.brandChipActive]}><Text style={[c.brandChipText, brand === item && c.brandChipTextActive]}>{item}</Text></Pressable>)}
    </ScrollView></View>
    <FlatList
      data={results}
      keyboardShouldPersistTaps="handled"
      keyExtractor={item => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={c.list}
      ListHeaderComponent={<View style={c.listHeader}><Text style={c.listHeaderTitle}>{query ? `Результаты для «${query}»` : brand === 'Все марки' ? 'Вся коллекция' : brand}</Text><Text style={c.listHeaderMeta}>НАЖМИ, ЧТОБЫ ОТКРЫТЬ</Text></View>}
      ListEmptyComponent={<View style={c.empty}><Text style={c.emptyIcon}>⌕</Text><Text style={c.emptyTitle}>Ничего не найдено</Text><Text style={c.emptyText}>Попробуй другое название, ноту или переключи марку.</Text></View>}
      renderItem={({ item }) => {
        const color = brandColors[item.brand];
        return <Pressable accessibilityRole="button" accessibilityLabel={`${item.brand}, ${item.name}`} onPress={() => setSelected(item)} style={({ pressed }) => [c.item, pressed && c.itemPressed]}>
          <View style={[c.itemVisual, { backgroundColor: `${color}20` }]}><View style={[c.itemDisc, { borderColor: color }]}><View style={[c.itemDiscCore, { backgroundColor: color }]} /></View><Text style={[c.itemInitials, { color }]}>{item.brand.slice(0, 2).toUpperCase()}</Text></View>
          <View style={c.itemCopy}><View style={c.itemMetaRow}><Text style={[c.itemBrand, { color }]}>{item.brand.toUpperCase()}</Text>{item.tng && <View style={c.tngBadge}><Text style={c.tngBadgeText}>TNG</Text></View>}</View><Text style={c.itemName} numberOfLines={2}>{item.name}</Text></View>
          <Text style={c.itemArrow}>›</Text>
        </Pressable>;
      }}
      ListFooterComponent={<Text style={c.footer}>Каталог сверен {catalogCheckedAt}. Метка TNG означает марку, связанную с ассортиментом или проектами сети по открытым материалам TNG. Наличие конкретного вкуса уточняй у мастера.</Text>}
    />

    <Modal visible={selected !== null} animationType="slide" onRequestClose={() => setSelected(null)}>
      <SafeAreaView style={c.modalSafe}>
        <StatusBar style="light" />
        <View style={c.detail}>
          <View style={c.detailHeader}><Text style={c.detailHeaderLabel}>КАРТОЧКА ВКУСА</Text><Pressable accessibilityRole="button" accessibilityLabel="Закрыть карточку" onPress={() => setSelected(null)} style={c.detailClose}><Text style={c.detailCloseText}>×</Text></Pressable></View>
          {selected && <>
            <View style={[c.detailVisual, { backgroundColor: `${brandColors[selected.brand]}20` }]}><View style={[c.detailDisc, { borderColor: brandColors[selected.brand] }]}><View style={[c.detailDiscCore, { backgroundColor: brandColors[selected.brand] }]} /></View><View style={[c.detailColorChip, { backgroundColor: brandColors[selected.brand] }]} /></View>
            <View style={c.detailMetaRow}><Text style={[c.detailBrand, { color: brandColors[selected.brand] }]}>{selected.brand.toUpperCase()}</Text>{selected.tng && <View style={c.detailTng}><Text style={c.detailTngText}>КАТАЛОГ TNG</Text></View>}</View>
            <Text style={c.detailName}>{selected.name}</Text>
            <View style={c.detailInfo}><Text style={c.detailInfoLabel}>КАК ИСПОЛЬЗОВАТЬ</Text><Text style={c.detailHint}>Покажи эту карточку мастеру и уточни наличие. Одна позиция бренда может сочетать несколько вкусовых нот.</Text></View>
            <Pressable accessibilityRole="button" style={c.shareButton} onPress={() => Share.share({ message: `${selected.brand} — ${selected.name}\nЕсть ли этот вкус в наличии?` })}><Text style={c.shareButtonText}>Поделиться названием</Text><Text style={c.shareButtonArrow}>↗</Text></Pressable>
          </>}
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}

const c = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', backgroundColor: '#0D0911', paddingTop: 11 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 15, paddingHorizontal: 20 },
  kicker: { color: '#FF775C', fontSize: 9, fontWeight: '900', letterSpacing: 1.9 },
  title: { color: '#F8F0E8', fontSize: 50, lineHeight: 55, fontWeight: '600', letterSpacing: -2.2, marginTop: 8 },
  resultBadge: { minWidth: 65, minHeight: 59, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 19, backgroundColor: '#201727', borderWidth: 1, borderColor: '#3A2D42' },
  resultBadgeNumber: { color: '#C7A6FF', fontSize: 18, fontWeight: '900' },
  resultBadgeLabel: { color: '#746779', fontSize: 6, fontWeight: '900', letterSpacing: 1.1, marginTop: 3 },
  subtitle: { maxWidth: 450, color: '#A69BAA', fontSize: 15, lineHeight: 22, marginHorizontal: 20, marginTop: 11 },
  searchWrap: { height: 62, marginHorizontal: 20, marginTop: 23, paddingHorizontal: 9, borderRadius: 20, backgroundColor: '#17111D', borderWidth: 1, borderColor: '#34273B', flexDirection: 'row', alignItems: 'center' },
  searchMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#271D2D' },
  searchMarkText: { color: '#C7A6FF', fontSize: 22 },
  search: { flex: 1, height: 59, paddingHorizontal: 12, color: '#F8F0E8', fontSize: 15 },
  clearButton: { width: 39, height: 42, alignItems: 'center', justifyContent: 'center' },
  clear: { color: '#8C7E90', fontSize: 23 },
  brandScroller: { height: 64, minHeight: 64, flexShrink: 0 },
  brandRail: { gap: 8, paddingHorizontal: 20, paddingTop: 13, paddingBottom: 15 },
  brandChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: '#17111D', borderWidth: 1, borderColor: '#302638' },
  brandChipActive: { backgroundColor: '#F4E9E1', borderColor: '#F4E9E1' },
  brandChipText: { color: '#9B8FA0', fontSize: 11, fontWeight: '700' },
  brandChipTextActive: { color: '#281B22', fontWeight: '900' },
  list: { paddingHorizontal: 20, paddingBottom: 126 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6, marginBottom: 11 },
  listHeaderTitle: { flex: 1, color: '#EDE3EB', fontSize: 14, fontWeight: '800' },
  listHeaderMeta: { color: '#665B6A', fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  item: { minHeight: 98, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, backgroundColor: '#17111D', borderWidth: 1, borderColor: '#302638', marginBottom: 9 },
  itemPressed: { opacity: .77 },
  itemVisual: { width: 71, height: 76, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  itemDisc: { width: 41, height: 41, borderRadius: 21, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  itemDiscCore: { width: 9, height: 9, borderRadius: 5 },
  itemInitials: { position: 'absolute', right: 6, top: 5, fontSize: 7, fontWeight: '900' },
  itemCopy: { flex: 1 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  itemBrand: { fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  tngBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#302338' },
  tngBadgeText: { color: '#C7A6FF', fontSize: 6, fontWeight: '900', letterSpacing: .8 },
  itemName: { color: '#F5ECE8', fontSize: 15, lineHeight: 21, fontWeight: '700', marginTop: 7 },
  itemArrow: { color: '#786B7D', fontSize: 26, paddingHorizontal: 5 },
  empty: { alignItems: 'center', padding: 34, borderRadius: 24, backgroundColor: '#17111D', marginTop: 8 },
  emptyIcon: { color: '#C7A6FF', fontSize: 34 },
  emptyTitle: { color: '#F8F0E8', fontSize: 19, fontWeight: '800', marginTop: 13 },
  emptyText: { color: '#9B8FA0', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  footer: { color: '#675C6B', fontSize: 10, lineHeight: 17, marginTop: 20 },
  modalSafe: { flex: 1, backgroundColor: '#0D0911' },
  detail: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 25 },
  detailHeader: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailHeaderLabel: { color: '#746779', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  detailClose: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#201727', borderWidth: 1, borderColor: '#3A2D42' },
  detailCloseText: { color: '#F8F0E8', fontSize: 25, lineHeight: 28 },
  detailVisual: { height: 220, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginTop: 18, overflow: 'hidden' },
  detailDisc: { width: 116, height: 116, borderRadius: 58, borderWidth: 17, alignItems: 'center', justifyContent: 'center' },
  detailDiscCore: { width: 26, height: 26, borderRadius: 13 },
  detailColorChip: { position: 'absolute', right: 18, bottom: 18, width: 24, height: 24, borderRadius: 12 },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 28 },
  detailBrand: { fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  detailTng: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: '#2B2031' },
  detailTngText: { color: '#C7A6FF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  detailName: { color: '#F8F0E8', fontSize: 37, lineHeight: 43, fontWeight: '700', letterSpacing: -1.4, marginTop: 11 },
  detailInfo: { padding: 17, borderRadius: 20, backgroundColor: '#17111D', borderWidth: 1, borderColor: '#302638', marginTop: 25 },
  detailInfoLabel: { color: '#7D7081', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  detailHint: { color: '#B2A6B5', fontSize: 14, lineHeight: 22, marginTop: 9 },
  shareButton: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderRadius: 18, backgroundColor: '#FF775C', marginTop: 'auto' },
  shareButtonText: { color: '#271416', fontSize: 15, fontWeight: '900' },
  shareButtonArrow: { color: '#271416', fontSize: 21, marginLeft: 'auto' },
});
