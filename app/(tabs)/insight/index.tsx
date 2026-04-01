import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import { useFonts } from "expo-font";
import {
  loadWardrobe,
  removeItem,
  WardrobeItem,
} from "@/lib/wardrobe";

type FacetKey =
  | "color"
  | "size"
  | "season"
  | "fabric"
  | "brand"
  | "location"
  | "category";


export default function WardrobeListScreen() {
  const [fontsLoaded] = useFonts({
    ProductSans: require("../../../assets/fonts/ProductSans-Regular.ttf"),
    "ProductSans-Bold": require("../../../assets/fonts/ProductSans-Bold.ttf"),
  });
  const router = useRouter();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [previewItem, setPreviewItem] = useState<WardrobeItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pageSize, setPageSize] = useState<"all" | 10 | 20 | 30>("all");
  const [page, setPage] = useState(1);
  const [sortActive, setSortActive] = useState<"price" | "date" | null>("price");


  // ===== filter states =====
  const [selected, setSelected] = useState<Record<FacetKey, Set<string>>>({
    color: new Set(),
    size: new Set(),
    season: new Set(),
    fabric: new Set(),
    brand: new Set(),
    location: new Set(),
    category: new Set(),
  });

  const [open, setOpen] = useState<Record<FacetKey, boolean>>({
    color: false,
    size: false,
    season: false,
    fabric: false,
    brand: false,
    location: false,
    category: false,
  });

  // ปุ่มเปิด/ปิด แผง filter รวม
  const [filterOpen, setFilterOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  async function loadItems() {
    const data = await AsyncStorage.getItem("wardrobeItems");
    setItems(data ? JSON.parse(data) : []);
  }

  const handleEditItem = (item: WardrobeItem) => {
    setPreviewItem(null);
    router.push({
      pathname: "/wardrobe/add",
      params: { id: item.id },
    });
  };

  const handleDeleteItem = (item: WardrobeItem) => {
    Alert.alert(
      "Delete item",
      `Delete "${item.name}" ?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeItem(item.id);      // 🔗 ใช้ lib
            const data = await loadWardrobe(); // 🔗 reload จาก lib
            setItems(data);
            setPreviewItem(null);
          },
        },
      ]
    );
  };

  // ===== facet options from data =====
  const options = useMemo(() => {
    const uniq = (getter: (i: WardrobeItem) => any) => {
      const s = new Set<string>();
      items.forEach((it) => {
        const v = getter(it);
        if (Array.isArray(v)) v.forEach((x) => x && s.add(String(x)));
        else if (v) s.add(String(v));
      });
      return Array.from(s).sort();
    };
    return {
      color: uniq((i) => i.color),
      size: uniq((i) => i.size),
      season: uniq((i) => i.season),
      fabric: uniq((i) => i.fabric),
      brand: uniq((i) => i.brand),
      location: uniq((i) =>
        Array.isArray(i.location) ? i.location : i.location ? [i.location] : []
      ),
      category: uniq((i) => i.category),
    };
  }, [items]);

const toggle = (facet: FacetKey, v: string) => {
  setSelected(prev => {
    const next = new Set(prev[facet]);

    if (next.has(v)) {
      next.delete(v);
    } else {
      next.add(v);
    }

    return { ...prev, [facet]: next };
  });
};


  const allClosed: Record<FacetKey, boolean> = {
    color: false,
    size: false,
    season: false,
    fabric: false,
    brand: false,
    location: false,
    category: false,
  };
  const toggleOpenFacet = (facet: FacetKey) =>
    setOpen((prev) => {
      const next = { ...allClosed };
      next[facet] = !prev[facet];
      return next;
    });

  const FacetDropdown = ({
    label,
    facet,
  }: {
    label: string;
    facet: FacetKey;
  }) => {
    const isOpen = open[facet];
    const values = options[facet];
    const hasSelected = selected[facet].size > 0;

    return (
      <View style={styles.fdWrap}>
        <Pressable
          onPress={() => toggleOpenFacet(facet)}
          style={[
            styles.fdHead,
            hasSelected && {
              borderColor: "#C00000",
              backgroundColor: "#FFF3F3",
            },
          ]}
        >
          <Text
            style={[
              styles.fdLabel,
              hasSelected && { color: "#C00000", fontFamily: "ProductSans-Bold" },
            ]}
          >
            {label}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {hasSelected && (
              <Text style={styles.countPill}>{selected[facet].size}</Text>
            )}
            <Ionicons
              name={isOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#8A8A8A"
            />
          </View>
        </Pressable>

        {isOpen && values.length > 0 && (
          <View style={styles.fdPanel}>
            <FlatList
              data={values}
              keyExtractor={(v) => `${facet}-${v}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: v }) => {
                const active = selected[facet].has(v);
                return (
                  <Pressable
                    onPress={() => toggle(facet, v)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipTxt, active && styles.chipTxtActive]}
                    >
                      {v}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        )}
      </View>
    );
  };

  const selectedChips = useMemo(() => {
    const toArr = (s: Set<string>) => Array.from(s);
    return [
      ...toArr(selected.color).map((v) => ({ f: "color" as FacetKey, v })),
      ...toArr(selected.size).map((v) => ({ f: "size" as FacetKey, v })),
      ...toArr(selected.season).map((v) => ({ f: "season" as FacetKey, v })),
      ...toArr(selected.fabric).map((v) => ({ f: "fabric" as FacetKey, v })),
      ...toArr(selected.brand).map((v) => ({ f: "brand" as FacetKey, v })),
      ...toArr(selected.location).map((v) => ({
        f: "location" as FacetKey,
        v,
      })),
      ...toArr(selected.category).map((v) => ({
        f: "category" as FacetKey,
        v,
      })),
    ];
  }, [selected]);


  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );


  // ===== derived lists (ใช้สำหรับทุก insight + list) =====
  const filtered = useMemo(() => {
    const check = (sel: Set<string>, val?: string | string[]) => {
      if (sel.size === 0) return true;
      if (Array.isArray(val)) return val.some((x) => x && sel.has(String(x)));
      return !!val && sel.has(String(val));
    };

    const q = searchText.trim().toLowerCase();

    const matchSearch = (it: WardrobeItem) => {
      if (!q) return true;
      return (
        it.name?.toLowerCase().includes(q) ||
        it.brand?.toLowerCase().includes(q) ||
        it.color?.toLowerCase().includes(q) ||
        it.category?.toLowerCase().includes(q)
      );
    };


    const out = items.filter(
      (it) =>
        matchSearch(it) &&
        check(selected.color, it.color) &&
        check(selected.size, it.size) &&
        check(selected.season, it.season) &&
        check(selected.fabric, it.fabric) &&
        check(selected.brand, it.brand) &&
        check(
          selected.location,
          Array.isArray(it.location)
            ? it.location
            : it.location
              ? [it.location]
              : []
        ) &&
        check(selected.category, it.category)
    );

    if (sortActive) {
      out.sort((a, b) => {
        const A =
          sortActive === "price"
            ? a.price ?? 0
            : a.datePurchased
              ? new Date(a.datePurchased).getTime()
              : 0;

        const B =
          sortActive === "price"
            ? b.price ?? 0
            : b.datePurchased
              ? new Date(b.datePurchased).getTime()
              : 0;

        return sortAsc ? A - B : B - A;
      });
    }

    return out;
  }, [items, selected, sortAsc, sortActive, searchText]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, filtered.length]);

  const totalPages =
    pageSize === "all"
      ? 1
      : Math.ceil(filtered.length / pageSize);

  const visibleItems = useMemo(() => {
    if (pageSize === "all") return filtered;

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return filtered.slice(start, end);
  }, [filtered, pageSize, page]);



  // ===== insight: ใช้ข้อมูลหลัง filter แล้ว =====
  const totalItem = filtered.length;
  const totalValue = filtered.reduce((sum, it) => sum + (it.price ?? 0), 0);


  const colorCount = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((i) => {
      const c = (i.color || "Unknown").trim();
      map.set(c, (map.get(c) || 0) + 1);
    });
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
    return arr.map(([name, cnt]) => ({ name, count: cnt, ratio: cnt / total }));
  }, [filtered]);

  const colorToHex = (name: string) => {
    const t = name.toLowerCase();
    const dict: Record<string, string> = {
      white: "#FFFFFF",
      black: "#000000",
      blue: "#517cc1ff",
      red: "#EF4444",
      green: "#45885eff",
      pink: "#f0acd0ff",
      brown: "#ad6c3aff",
      beige: "#F5E6CC",
      yellow: "#FACC15",
      purple: "#A78BFA",
      grey: "#9CA3AF",
      gray: "#9CA3AF",
      navy: "#1E3A8A",
      orange: "#FB923C",
      khaki: "#C3B091",
      jeans: "#465478ff",
      lightblue: "#b5dcf0ff",
      unknown: "#D1D5DB",
    };
    return dict[t] || name || "#D1D5DB";
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }} // ⭐ เผื่อ FAB
      >
        {/* HEADER */}
        <View>
          {/* Stats */}
          <View style={styles.statRow}>
            <View style={styles.statBoxSmall}>
              <Text style={styles.statHeader}>Total item</Text>
              <Text style={styles.statValue}>{totalItem}</Text>
            </View>
            <View style={styles.statBoxLarge}>
              <Text style={styles.statHeader}>Total closet value</Text>
              <Text style={styles.statValue}>{totalValue.toLocaleString()}</Text>
            </View>
          </View>

          {/* Color breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Color breakdown</Text>
            <View style={styles.colorBarShadow}>
              <View style={styles.colorBar}>
                {colorCount.map((c, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === colorCount.length - 1;

                  return (
                    <View
                      key={idx}
                      style={{
                        flex: c.ratio,
                        backgroundColor: colorToHex(c.name),
                        height: 18,
                        borderTopLeftRadius: isFirst ? 9 : 0,
                        borderBottomLeftRadius: isFirst ? 9 : 0,
                        borderTopRightRadius: isLast ? 9 : 0,
                        borderBottomRightRadius: isLast ? 9 : 0,
                      }}
                    />
                  );
                })}
              </View>
            </View>

          </View>
          <View style={styles.controlBar}>
            {/* LEFT */}
            <View style={styles.controlLeft}>
              <Pressable
                style={[
                  styles.controlBtn,
                  sortActive === "price" && styles.controlBtnActive,
                ]}
                onPress={() => {
                  if (sortActive === "price") {
                    setSortAsc(v => !v);
                  } else {
                    setSortActive("price");
                    setSortAsc(true);
                  }
                }}
              >
                <Text
                  style={[
                    styles.controlTxt,
                    sortActive === "price" && styles.controlTxtActive,
                  ]}
                >
                  Price
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.controlBtn,
                  sortActive === "date" && styles.controlBtnActive,
                ]}
                onPress={() => {
                  if (sortActive === "date") {
                    setSortAsc(v => !v);
                  } else {
                    setSortActive("date");
                    setSortAsc(true);
                  }
                }}
              >
                <Text
                  style={[
                    styles.controlTxt,
                    sortActive === "date" && styles.controlTxtActive,
                  ]}
                >
                  Date
                </Text>
              </Pressable>
              <Pressable
                style={styles.controlBtn}
                onPress={() => {
                  if (!sortActive) return;
                  setSortAsc(v => !v);
                }}
              >
                <Ionicons
                  name={sortAsc ? "arrow-up-outline" : "arrow-down-outline"}
                  size={14}
                  color={sortActive ? "#C00000" : "#999"}
                />
              </Pressable>

              <Pressable
                style={styles.controlBtn}
                onPress={() => setFilterOpen(v => !v)}
              >
                <Ionicons name="options" size={16} color="#C00000" />
              </Pressable>

              <Pressable
                style={styles.controlBtn}
                onPress={() => setSearchOpen(v => !v)}
              >
                <Ionicons name="search" size={16} color="#C00000" />
              </Pressable>
            </View>

            {/* RIGHT */}
            <View style={styles.controlRight}>
              <Pressable onPress={() => setViewMode("grid")}>
                <Ionicons
                  name="grid-outline"
                  size={18}
                  color={viewMode === "grid" ? "#C00000" : "#999"}
                />
              </Pressable>

              <Pressable onPress={() => setViewMode("list")}>
                <Ionicons
                  name="list-outline"
                  size={18}
                  color={viewMode === "list" ? "#C00000" : "#999"}
                />
              </Pressable>
            </View>
          </View>



          {selectedChips.length > 0 && (
            <FlatList
              data={selectedChips}
              keyExtractor={(it) => `${it.f}-${it.v}-sel`}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 6 }}
              renderItem={({ item: { f, v } }) => (
                <Pressable
                  onPress={() => toggle(f, v)}
                  style={[styles.chip, styles.chosenChip]}
                >
                  <Text style={[styles.chipTxt, styles.chosenChipTxt]}>{v}</Text>
                  <Ionicons name="close" size={14} color="#C00000" />
                </Pressable>
              )}
            />
          )}


          {filterOpen && (
            <View style={styles.listCard}>
              <View style={styles.facetGrid}>
                <FacetDropdown label="Color" facet="color" />
                <FacetDropdown label="Size" facet="size" />
                <FacetDropdown label="Season" facet="season" />
                <FacetDropdown label="Fabric" facet="fabric" />
                <FacetDropdown label="Brand" facet="brand" />
                <FacetDropdown label="Location" facet="location" />
                <FacetDropdown label="Category" facet="category" />
              </View>
            </View>
          )}

          {searchOpen && (
            <View style={{ marginBottom: 12 }}>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={20} color="#9A9A9A" />
                <TextInput
                  autoFocus
                  placeholder="Search clothes, brand, color..."
                  placeholderTextColor="#B5B5B5"
                  value={searchText}
                  onChangeText={setSearchText}
                  style={styles.searchInput}
                />
                {searchText.length > 0 && (
                  <Pressable onPress={() => setSearchText("")} hitSlop={8}>
                    <Ionicons name="close" size={20} color="#9A9A9A" />
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
        <View style={styles.pageBar}>
          {/* Prev */}
          {pageSize !== "all" && page > 1 && (
            <Pressable onPress={() => setPage(p => Math.max(1, p - 1))}>
              <Text style={styles.pageBtn}>‹</Text>
            </Pressable>
          )}

          {([10, 20, 30] as const).map(n => (
            <Pressable
              key={n}
              onPress={() => {
                setPageSize(n);
                setPage(1);
              }}
            >
              <Text
                style={[
                  styles.pageBtn,
                  pageSize === n && styles.pageBtnActive,
                ]}
              >
                {n}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => {
              setPageSize("all");
              setPage(1);
            }}
          >
            <Text
              style={[
                styles.pageBtn,
                pageSize === "all" && styles.pageBtnActive,
              ]}
            >
              All
            </Text>
          </Pressable>

          {/* Next */}
          {pageSize !== "all" && page < totalPages && (
            <Pressable onPress={() => setPage(p => Math.min(totalPages, p + 1))}>
              <Text style={styles.pageBtn}>›</Text>
            </Pressable>
          )}
        </View>



        {/* LIST */}
        {viewMode === "grid" ? (
          <View style={styles.grid}>
            {visibleItems.map(item => (
              <Pressable
                key={item.id}
                style={styles.itemCard}
                onPress={() => setPreviewItem(item)}
              >
                <Image source={{ uri: item.imageUri }} style={styles.itemImage} />
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemBrand}>{item.brand}</Text>
                <Text style={styles.itemDesc}>
                  {item.size && `Size ${item.size}`}
                  {item.category && ` • ${item.category}`}
                  {typeof item.price === "number" && ` • ฿${item.price.toLocaleString()}`}
                </Text>

              </Pressable>
            ))}
          </View>
        ) : (
          <View>
            {visibleItems.map(item => (
              <Pressable
                key={item.id}
                style={styles.listItem}
                onPress={() => setPreviewItem(item)}
              >
                <Image source={{ uri: item.imageUri }} style={styles.listImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDesc}>
                    {item.size && `Size ${item.size}`} • {item.category}
                  </Text>
                  {item.datePurchased && (
                    <Text style={{ fontSize: 11, color: "#999" }}>
                      Purchased {new Date(item.datePurchased).toLocaleDateString()}
                    </Text>
                  )}

                </View>
              </Pressable>
            ))}
          </View>
        )}

      </ScrollView>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push("/wardrobe/add")}
      >
        <Ionicons name="add-sharp" size={28} color="#fff" />
      </Pressable>

      {/* MODAL */}
      {previewItem && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.previewCard}>
              {/* ICON ACTIONS (BOTTOM LEFT) */}
              <View style={styles.modalActionLeft}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => handleEditItem(previewItem)}
                  hitSlop={10}
                >
                  <Ionicons name="create-outline" size={18} color="#C00000" />
                </Pressable>

                <Pressable
                  style={[styles.iconBtn, styles.iconDelete]}
                  onPress={() => handleDeleteItem(previewItem)}
                  hitSlop={10}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                </Pressable>
              </View>
              <Pressable
                style={styles.previewClose}
                onPress={() => setPreviewItem(null)}
              >
                <Ionicons name="close" size={22} color="#000" />
              </Pressable>
              <Image
                source={{ uri: previewItem.imageUri }}
                style={styles.previewImage}
              />
              <Text style={styles.previewName}>{previewItem.name}</Text>
              {previewItem.brand && (
                <Text style={styles.previewBrand}>{previewItem.brand}</Text>
              )}
              <View style={{ marginTop: 8, gap: 6, paddingBottom: 40 }}>
                {previewItem.category && (
                  <InfoRow label="Category" value={previewItem.category} />
                )}
                {previewItem.color && (
                  <InfoRow label="Color" value={previewItem.color} />
                )}
                {previewItem.size && (
                  <InfoRow label="Size" value={previewItem.size} />
                )}
                {typeof previewItem.price === "number" && (
                  <InfoRow
                    label="Price"
                    value={`฿${previewItem.price.toLocaleString()}`}
                  />
                )}
                {previewItem.datePurchased && (
                  <InfoRow
                    label="Added"
                    value={new Date(previewItem.datePurchased).toLocaleDateString()}
                  />
                )}
              </View>

            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9", paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 6,
  },
  title: {
    fontFamily: "ProductSans-Bold",
    fontSize: 24,
    marginTop: 10,
    marginBottom: 8,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },
  avatar: {
    backgroundColor: "#C00000",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: "ProductSans-Bold", fontSize: 18, color: "#000" },
  subName: { fontFamily: "ProductSans", fontSize: 13, color: "#555" },
  email: { fontFamily: "ProductSans", fontSize: 12, color: "#888" },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.select({ ios: 12, android: 10 }),
    fontFamily: "ProductSans",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnPrimary: { backgroundColor: "#C00000", borderColor: "#C00000" },
  btnPrimaryTxt: { color: "#fff", fontFamily: "ProductSans-Bold" },
  btnGhost: { backgroundColor: "#FFF", borderColor: "#FFD4D6" },
  btnGhostTxt: { color: "#C00000", fontFamily: "ProductSans-Bold" },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 10,
    gap: 10,
  },
  statBoxSmall: {
    flex: 0.4,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "flex-start",
  },
  statBoxLarge: {
    flex: 0.6,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "flex-start",
  },
  statHeader: {
    fontFamily: "ProductSans-Bold",
    color: "#2f2e2eff",
    marginBottom: 4,
    fontSize: 20,
  },
  statValue: { fontFamily: "ProductSans-Bold", color: "#C00000", fontSize: 22 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: "ProductSans-Bold",
    color: "#333",
    marginBottom: 10,
  },
  colorBar: {
    flexDirection: "row",
    backgroundColor: "#EFEFEF",
    borderRadius: 9,
    overflow: "hidden",
  },
  colorBarShadow: {
    borderRadius: 9,

    // 👇 shadow เบามาก ใต้เส้น
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,

    // Android
    elevation: 3,

    marginBottom: 2,
  },

  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sortTxt: { marginLeft: 6, fontFamily: "ProductSans-Bold", color: "#C00000" },
  clearAll: { fontFamily: "ProductSans-Bold", color: "#C00000" },

  // ปุ่มเปิด filter รวม
  filterBar: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  filterTxt: {
    marginLeft: 6,
    fontFamily: "ProductSans-Bold",
    color: "#C00000",
  },

  listCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    overflow: "visible",
  },
  countPill: {
    backgroundColor: "#FFE9EA",
    color: "#C00000",
    fontFamily: "ProductSans-Bold",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginRight: 6,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6e6e6",
    marginRight: 6,
  },
  chipActive: { backgroundColor: "#ffe9ea", borderColor: "#C00000" },
  chipTxt: { fontFamily: "ProductSans", color: "#222", fontSize: 12 },
  chipTxtActive: { color: "#C00000", fontFamily: "ProductSans-Bold" },
  chosenChip: {
    backgroundColor: "#fff3f3",
    borderColor: "#ffd6d6",
    marginBottom: 6,
  },
  chosenChipTxt: {
    color: "#C00000",
    marginRight: 4,
    fontFamily: "ProductSans-Bold",
  },

  itemCard: {
    width: "47%",
    backgroundColor: "#FFF",
    borderRadius: 18,
    marginBottom: 18,
    padding: 12,
    position: 'relative',
  },
  itemImage: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  itemName: { fontFamily: "ProductSans-Bold", fontSize: 14, marginTop: 8 },
  itemBrand: { fontFamily: "ProductSans", fontSize: 12, color: "#444" },
  itemDesc: {
    fontFamily: "ProductSans",
    fontSize: 11,
    color: "#777",
    marginTop: 2,
  },

  noItem: {
    textAlign: "center",
    color: "#888",
    fontFamily: "ProductSans",
    marginTop: 20,
  },

  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#C00000",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
  },

  facetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    overflow: "visible",
  },

  fdWrap: { width: "32%", marginBottom: 12, position: "relative" },
  fdHead: {
    height: 38,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fdLabel: { fontFamily: "ProductSans", fontSize: 13, color: "#222" },

  fdPanel: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    zIndex: 999,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },

  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontFamily: 'ProductSans',
    fontSize: 14,
    color: '#000',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  previewCard: {
    width: "74%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 14,
    position: "relative",
  },

  previewClose: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 10,
  },

  previewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 10,
  },

  previewName: {
    fontFamily: "ProductSans-Bold",
    fontSize: 18,
  },

  previewBrand: {
    fontFamily: "ProductSans",
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  infoLabel: {
    fontFamily: "ProductSans",
    fontSize: 12,
    color: "#555",
  },

  infoValue: {
    fontFamily: "ProductSans-Bold",
    fontSize: 14,
    color: "#000",
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  controlBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  controlLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  controlRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  controlBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#eee",
  },

  controlTxt: {
    fontFamily: "ProductSans-Bold",
    fontSize: 12,
    color: "#C00000",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },

  listImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  pageBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  pageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    fontFamily: "ProductSans-Bold",
    fontSize: 12,
    color: "#777",
  },

  pageBtnActive: {
    backgroundColor: "#C00000",
    borderColor: "#C00000",
    color: "#fff",
  },
  controlBtnActive: {
    backgroundColor: "#C00000",
    borderColor: "#C00000",
  },

  controlTxtActive: {
    color: "#fff",
  },
  // ===== MODAL ICON ACTIONS =====
  modalActionLeft: {
    position: "absolute",
    bottom: 15,
    right: 14,
    flexDirection: "row",
    gap: 10,
    zIndex: 5,
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  iconDelete: {
    backgroundColor: "#C00000",
    borderColor: "#C00000",
  },

});
