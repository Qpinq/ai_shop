"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/types";

interface ProductFiltersProps {
  products: Product[];
  onFilteredChange: (filtered: Product[]) => void;
}

export default function ProductFilters({ products, onFilteredChange }: ProductFiltersProps) {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [sortBy, setSortBy] = useState<string>("default");
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))];
    return cats.sort();
  }, [products]);

  const brands = useMemo(() => {
    const b = [...new Set(products.map((p) => p.brand))];
    return b.sort();
  }, [products]);

  const maxPrice = useMemo(() => {
    return Math.max(...products.map((p) => p.price));
  }, [products]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const clearAll = () => {
    setSearch("");
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([0, 100000]);
    setSortBy("default");
  };

  const hasActiveFilters =
    search !== "" ||
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    priceRange[0] > 0 ||
    priceRange[1] < maxPrice ||
    sortBy !== "default";

  useMemo(() => {
    let result = [...products];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((p) => selectedCategories.includes(p.category));
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }

    result = result.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "reviews":
        result.sort((a, b) => b.reviews_count - a.reviews_count);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        break;
    }

    onFilteredChange(result);
  }, [search, selectedCategories, selectedBrands, priceRange, sortBy, products, onFilteredChange]);

  return (
    <div className="space-y-4">
      {/* Search + Toggle filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск товаров..."
            className="pl-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearch("")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Фильтры
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {[selectedCategories.length > 0 ? 1 : 0, selectedBrands.length > 0 ? 1 : 0, search ? 1 : 0, sortBy !== "default" ? 1 : 0].reduce((a, b) => a + b, 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Active filter tags */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-wrap gap-2"
        >
          {search && (
            <Badge variant="secondary" className="gap-1 pl-2 pr-1">
              Поиск: {search}
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => setSearch("")}>
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {selectedCategories.map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-1 pl-2 pr-1">
              {cat}
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => toggleCategory(cat)}>
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          {selectedBrands.map((brand) => (
            <Badge key={brand} variant="secondary" className="gap-1 pl-2 pr-1">
              {brand}
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => toggleBrand(brand)}>
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
            <Badge variant="secondary" className="gap-1 pl-2 pr-1">
              {priceRange[0].toLocaleString("ru-RU")} — {priceRange[1].toLocaleString("ru-RU")} ₽
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => setPriceRange([0, 100000])}>
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          )}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAll}>
              Сбросить всё
            </Button>
          )}
        </motion.div>
      )}

      {/* Expanded filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Categories */}
                  <div>
                    <h3 className="font-medium text-sm mb-3">Категория</h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => {
                        const isActive = selectedCategories.includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Brands */}
                  <div>
                    <h3 className="font-medium text-sm mb-3">Бренд</h3>
                    <div className="flex flex-wrap gap-2">
                      {brands.map((brand) => {
                        const isActive = selectedBrands.includes(brand);
                        return (
                          <button
                            key={brand}
                            onClick={() => toggleBrand(brand)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {brand}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price range + Sort */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-sm mb-3">Цена</h3>
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            value={priceRange[0]}
                            onChange={(e) =>
                              setPriceRange([Math.min(Number(e.target.value), priceRange[1]), priceRange[1]])
                            }
                            className="h-8 text-xs"
                            placeholder="От"
                            min={0}
                          />
                          <span className="text-xs text-muted-foreground">—</span>
                          <Input
                            type="number"
                            value={priceRange[1]}
                            onChange={(e) =>
                              setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0])])
                            }
                            className="h-8 text-xs"
                            placeholder="До"
                            min={0}
                          />
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={maxPrice}
                          step={1000}
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                          className="w-full accent-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-sm mb-2">Сортировка</h3>
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-transparent px-3 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="default">По умолчанию</option>
                          <option value="price-asc">Сначала дешёвые</option>
                          <option value="price-desc">Сначала дорогие</option>
                          <option value="rating">По рейтингу</option>
                          <option value="reviews">По популярности</option>
                          <option value="name">По названию</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    Найдено товаров: <span className="font-medium text-foreground">{products.filter((p) => {
                      let result = true;
                      if (search) {
                        const q = search.toLowerCase();
                        result = p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
                      }
                      if (result && selectedCategories.length > 0) result = selectedCategories.includes(p.category);
                      if (result && selectedBrands.length > 0) result = selectedBrands.includes(p.brand);
                      if (result) result = p.price >= priceRange[0] && p.price <= priceRange[1];
                      return result;
                    }).length}</span>
                  </p>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={clearAll}>
                      <X className="w-3 h-3 mr-1" />
                      Сбросить
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
