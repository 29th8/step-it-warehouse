import { useState, useMemo, useCallback } from "react";

// =============================================
// TYPES
// =============================================
export interface ComponentFilterState {
  searchQuery: string;
  category: string;
  generation: string;
  capacity: string;
  attrType: string;       // Storage type (SSD/HDD)
  storageInterface: string;
  cpuSeries: string;
}

export interface ActiveFilter {
  key: keyof ComponentFilterState;
  label: string;
  value: string;
}

const INITIAL_STATE: ComponentFilterState = {
  searchQuery: "",
  category: "ALL",
  generation: "none",
  capacity: "none",
  attrType: "none",
  storageInterface: "none",
  cpuSeries: "none",
};

// =============================================
// HOOK
// =============================================
export function useComponentFilters() {
  const [filters, setFilters] = useState<ComponentFilterState>(INITIAL_STATE);

  // Setter helpers
  const setFilter = useCallback(<K extends keyof ComponentFilterState>(key: K, value: ComponentFilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset dependent spec filters when category changes
  const onCategoryChange = useCallback((category: string) => {
    setFilters(prev => ({
      ...prev,
      category,
      generation: "none",
      capacity: "none",
      attrType: "none",
      storageInterface: "none",
      cpuSeries: "none",
    }));
  }, []);

  // Reset all filters
  const resetAll = useCallback(() => {
    setFilters(INITIAL_STATE);
  }, []);

  // Build URLSearchParams from active filter state
  const buildFilterParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("component", "true");

    if (filters.category !== "ALL") params.append("category", filters.category);
    if (filters.searchQuery) params.append("search", filters.searchQuery);

    // Category-specific spec filters
    if (filters.category === "MEMORY") {
      if (filters.generation !== "none") params.append("generation", filters.generation);
      if (filters.capacity !== "none") params.append("capacity", filters.capacity);
    }

    if (filters.category === "STORAGE") {
      if (filters.attrType !== "none") params.append("attrType", filters.attrType);
      if (filters.capacity !== "none") params.append("capacity", filters.capacity);
      if (filters.storageInterface !== "none") params.append("interface", filters.storageInterface);
    }

    if (filters.category === "CPU") {
      if (filters.cpuSeries !== "none") params.append("series", filters.cpuSeries);
    }

    params.append("take", "30");

    return params.toString();
  }, [filters]);

  // List of currently active filters for badge display
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = [];
    if (filters.category !== "ALL") list.push({ key: "category", label: "Danh mục", value: filters.category });
    if (filters.generation !== "none") list.push({ key: "generation", label: "RAM", value: filters.generation });
    if (filters.capacity !== "none") list.push({ key: "capacity", label: "Dung lượng", value: filters.capacity });
    if (filters.attrType !== "none") list.push({ key: "attrType", label: "Loại ổ", value: filters.attrType });
    if (filters.storageInterface !== "none") list.push({ key: "storageInterface", label: "Giao tiếp", value: filters.storageInterface });
    if (filters.cpuSeries !== "none") list.push({ key: "cpuSeries", label: "CPU Series", value: filters.cpuSeries });
    return list;
  }, [filters]);

  // Remove a single filter
  const removeFilter = useCallback((key: keyof ComponentFilterState) => {
    if (key === "category") {
      onCategoryChange("ALL");
    } else {
      setFilters(prev => ({ ...prev, [key]: "none" }));
    }
  }, [onCategoryChange]);

  return {
    filters,
    setFilter,
    onCategoryChange,
    resetAll,
    buildFilterParams,
    activeFilters,
    removeFilter,
  };
}
