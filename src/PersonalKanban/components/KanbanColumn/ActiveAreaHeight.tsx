import React from "react";

import { ACTIVE_SLOTS, ACTIVE_SLOT_HEIGHT } from "PersonalKanban/constants";

/**
 * 讓所有欄位的「進行中」區塊一樣高，「已完成」區才會從同一條水平線開始：
 * - 至少保留 ACTIVE_SLOTS 張便條紙的高度（沒有卡片也一樣）
 * - 某一欄進行中的卡片更多時，所有欄位一起長高到那一欄的高度
 */
type Ctx = { minHeight: number; report: (id: string, height: number) => void };

const BASE = ACTIVE_SLOTS * ACTIVE_SLOT_HEIGHT;

const ActiveAreaHeightContext = React.createContext<Ctx>({ minHeight: BASE, report: () => {} });

export const ActiveAreaHeightProvider: React.FC = ({ children }) => {
  const [heights, setHeights] = React.useState<{ [id: string]: number }>({});

  const report = React.useCallback((id: string, height: number) => {
    setHeights((h) => {
      if (height < 0) {
        if (!(id in h)) return h;
        const { [id]: _removed, ...rest } = h;
        return rest;
      }
      return h[id] === height ? h : { ...h, [id]: height };
    });
  }, []);

  const value = React.useMemo(
    () => ({ minHeight: Math.max(BASE, ...Object.values(heights)), report }),
    [heights, report]
  );

  return <ActiveAreaHeightContext.Provider value={value}>{children}</ActiveAreaHeightContext.Provider>;
};

/** 回傳要套用的最小高度，並回報這一欄實際內容的高度 */
export const useActiveAreaHeight = (columnId: string) => {
  const { minHeight, report } = React.useContext(ActiveAreaHeightContext);
  const ref = React.useRef<HTMLDivElement | null>(null);

  // 每次重新繪製後量一次（新增 / 刪除 / 搬移卡片）
  React.useLayoutEffect(() => {
    if (ref.current) report(columnId, Math.ceil(ref.current.getBoundingClientRect().height));
  });

  // 內容高度自己變化時（字型載入、視窗縮放造成換行）也重新量
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => report(columnId, Math.ceil(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => {
      ro.disconnect();
      report(columnId, -1);
    };
  }, [columnId, report]);

  return { minHeight, contentRef: ref };
};
