import React from "react";

import { ACTIVE_SLOTS, ACTIVE_SLOT_HEIGHT } from "PersonalKanban/constants";

/**
 * 讓並排的欄位某個區塊一樣高（取所有欄位裡最高的那一個）：
 * - "header"：欄位標題列（標題可換行完整顯示，各欄仍對齊）
 * - "active"：進行中區塊，至少保留 ACTIVE_SLOTS 張便條紙的高度
 * 這樣各欄的「已完成」區才會從同一條水平線開始。
 */
type Group = "header" | "active";
type Heights = { [group: string]: { [id: string]: number } };
type Ctx = { heights: Heights; report: (group: Group, id: string, height: number) => void };

const BASE: { [g in Group]: number } = { header: 0, active: ACTIVE_SLOTS * ACTIVE_SLOT_HEIGHT };

const SyncedHeightContext = React.createContext<Ctx>({ heights: {}, report: () => {} });

export const ActiveAreaHeightProvider: React.FC = ({ children }) => {
  const [heights, setHeights] = React.useState<Heights>({});

  const report = React.useCallback((group: Group, id: string, height: number) => {
    setHeights((all) => {
      const h = all[group] || {};
      if (height < 0) {
        if (!(id in h)) return all;
        const { [id]: _removed, ...rest } = h;
        return { ...all, [group]: rest };
      }
      return h[id] === height ? all : { ...all, [group]: { ...h, [id]: height } };
    });
  }, []);

  const value = React.useMemo(() => ({ heights, report }), [heights, report]);

  return <SyncedHeightContext.Provider value={value}>{children}</SyncedHeightContext.Provider>;
};

/** 回傳要套用的最小高度，並回報這一欄實際內容的高度（contentRef 量的是內容本身，不含 minHeight） */
export const useSyncedHeight = (group: Group, columnId: string) => {
  const { heights, report } = React.useContext(SyncedHeightContext);
  const ref = React.useRef<HTMLDivElement | null>(null);

  // 每次重新繪製後量一次（新增 / 刪除 / 搬移卡片、改標題）
  React.useLayoutEffect(() => {
    if (ref.current) report(group, columnId, Math.ceil(ref.current.getBoundingClientRect().height));
  });

  // 內容高度自己變化時（字型載入、拉欄寬造成換行）也重新量
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => report(group, columnId, Math.ceil(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => {
      ro.disconnect();
      report(group, columnId, -1);
    };
  }, [group, columnId, report]);

  const minHeight = Math.max(BASE[group], ...Object.values(heights[group] || {}));
  return { minHeight, contentRef: ref };
};

export const useActiveAreaHeight = (columnId: string) => useSyncedHeight("active", columnId);
