import { useMemo, useState } from "react";

type Props = {
  items: string[];
  selected: string[];
  onChange: (vals: string[]) => void;

  defaultTopN?: number; 
  heightPx?: number;  
};

export function SalaryCompareSelector({
  items,
  selected,
  onChange,
  heightPx = 220,
}: Props) {
  const [query, setQuery] = useState("");

  // Filter visible list based on search
  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = items ?? [];
    if (!q) return base;
    return base.filter((x) => x.toLowerCase().includes(q));
  }, [items, query]);

  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((x) => selected.includes(x));

  function toggle(item: string) {
    if (selected.includes(item)) {
      onChange(selected.filter((x) => x !== item));
    } else {
      onChange([...selected, item]);
    }
  }

  function selectAllVisible() {
    // Add all visible items (keeps existing selections too)
    const set = new Set(selected);
    visibleItems.forEach((x) => set.add(x));
    onChange(Array.from(set));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-full border rounded px-3 py-2 bg-white"
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllVisible}
          disabled={visibleItems.length === 0}
          className="px-3 py-1 rounded border bg-white disabled:opacity-50"
        >
          Select All{query.trim() ? " (filtered)" : ""}
        </button>

        <button
          type="button"
          onClick={clearAll}
          disabled={selected.length === 0}
          className="px-3 py-1 rounded border bg-white disabled:opacity-50"
        >
          Clear
        </button>

        <div className="text-sm text-slate-600 self-center">
          Selected: {selected.length}
          {allVisibleSelected && visibleItems.length > 0 ? " (all visible)" : ""}
        </div>
      </div>

      {/* Checkbox list */}
      <div
        className="border rounded bg-white overflow-y-auto p-2"
        style={{ height: heightPx }}
      >
        {visibleItems.length === 0 ? (
          <div className="text-sm text-slate-500 p-2">No matches.</div>
        ) : (
          visibleItems.map((item) => (
            <label key={item} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={selected.includes(item)}
                onChange={() => toggle(item)}
              />
              <span className="text-sm">{item}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
