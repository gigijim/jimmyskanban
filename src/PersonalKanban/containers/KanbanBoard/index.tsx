import React from "react";

import Box from "@material-ui/core/Box";
import { makeStyles } from "@material-ui/core/styles";

import KanbanBoard from "PersonalKanban/components/KanbanBoard";
import { Column, Record, Stamp } from "PersonalKanban/types";
import {
  getId,
  getCreatedAt,
  getInitialState,
  reorder,
  moveRecord,
  applyStamp,
  nextStamp,
  normalizeColumns,
  filterColumns,
} from "PersonalKanban/services/Utils";
import { SearchContext } from "PersonalKanban/components/KanbanColumn/SearchContext";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import StorageService from "PersonalKanban/services/StorageService";
import Toolbar from "PersonalKanban/containers/Toolbar";

const useKanbanBoardStyles = makeStyles((theme) => ({
  toolbar: theme.mixins.toolbar,
}));

type KanbanBoardContainerProps = {};

const loadInitialState = (): Column[] => {
  const saved = StorageService.getColumns();
  if (!saved) return getInitialState();
  try {
    // 舊版（原版 Personal Kanban）資料：補上修改時間 / 完成時間 / 印章欄位
    return normalizeColumns(saved);
  } catch (e) {
    return getInitialState();
  }
};

const KanbanBoardContainer: React.FC<KanbanBoardContainerProps> = (props) => {
  const [columns, setColumns] = React.useState<Column[]>(loadInitialState);
  const columnsRef = React.useRef(columns);
  columnsRef.current = columns;

  // ---- 搜尋：只影響畫面，資料仍是完整的 columns
  const { t } = useTranslation();
  const [query, setQuery] = React.useState("");
  const searching = Boolean(query.trim());
  const stampText = React.useCallback(
    (r: Record) => (r.stamp === "done" ? t("stampDone") : r.stamp === "important" ? t("stampImportant") : ""),
    [t]
  );
  const visibleColumns = React.useMemo(
    () => (searching ? filterColumns(columns, query, stampText) : columns),
    [columns, query, searching, stampText]
  );
  const resultCount = React.useMemo(
    () => (searching ? visibleColumns.reduce((n, c) => n + (c.records || []).length, 0) : 0),
    [searching, visibleColumns]
  );

  const classes = useKanbanBoardStyles();

  const cloneColumns = React.useCallback((columns: Column[]) => {
    return columns.map((column: Column) => ({
      ...column,
      records: [...column.records!],
    }));
  }, []);

  const getColumnIndex = React.useCallback(
    (id: string) => {
      return columns.findIndex((c: Column) => c.id === id);
    },
    [columns]
  );

  const getRecordIndex = React.useCallback(
    (recordId: string, columnId: string) => {
      return columns[getColumnIndex(columnId)]?.records?.findIndex(
        (r: Record) => r.id === recordId
      );
    },
    [columns, getColumnIndex]
  );

  const handleClearBoard = React.useCallback(() => {
    setColumns((columns) => {
      StorageService.addSnapshot(columns, "beforeClear");
      return [];
    });
  }, []);

  /** 匯入 / 還原：整個看板換成新的內容 */
  const handleReplaceBoard = React.useCallback((next: Column[]) => {
    setColumns(next);
  }, []);

  const handleAddColumn = React.useCallback(
    ({ column }: { column: Column }) => {
      setColumns((columns: Column[]) => [
        ...columns,
        Object.assign(
          { id: getId(), records: [], createdAt: getCreatedAt() },
          column
        ),
      ]);
    },
    []
  );

  const handleColumnMove = React.useCallback(
    ({ column, index }: { column: Column; index: number }) => {
      // 搜尋時部分欄位被隱藏，位置對不上，不允許移動欄位
      if (searching) return;
      const updatedColumns = reorder(columns, getColumnIndex(column.id), index);
      setColumns(updatedColumns);
    },
    [columns, getColumnIndex, searching]
  );

  const handleColumnEdit = React.useCallback(
    ({ column }: { column: Column }) => {
      setColumns((_columns: Column[]) => {
        const columnIndex = getColumnIndex(column.id);
        const columns = cloneColumns(_columns);
        columns[columnIndex].title = column.title;
        columns[columnIndex].description = column.description;
        columns[columnIndex].color = column.color;
        // 自訂欄寬（拖曳欄位右側邊緣）；0 = 恢復自動
        if ("width" in column) {
          if (column.width) columns[columnIndex].width = column.width;
          else delete columns[columnIndex].width;
        }
        return columns;
      });
    },
    [getColumnIndex, cloneColumns]
  );

  const handleColumnDelete = React.useCallback(
    ({ column }: { column: Column }) => {
      // 刪除整條欄位前先存一份快照，可從「備份 / 匯入 / 匯出 → 自動快照」還原
      StorageService.addSnapshot(columnsRef.current, "beforeColumnDelete").catch((e) => console.error("[JimmysKanban] 快照失敗", e));
      setColumns((_columns: Column[]) => {
        const columns = cloneColumns(_columns);
        columns.splice(getColumnIndex(column.id), 1);
        return columns;
      });
    },
    [cloneColumns, getColumnIndex]
  );

  /** 拖曳便條紙：拖進完成區 = 已完成；拖出完成區 = 取消完成 */
  const handleCardMove = React.useCallback(
    ({
      column,
      index,
      source,
      record,
      toDone,
    }: {
      column: Column;
      index: number;
      source: Column;
      record: Record;
      toDone?: boolean;
    }) => {
      StorageService.logActivity();
      setColumns((columns) =>
        moveRecord({
          columns,
          recordId: record.id,
          sourceColumnId: source.id,
          destinationColumnId: column.id,
          destinationIndex: index,
          toDone: Boolean(toDone),
        })
      );
    },
    []
  );

  const handleAddRecord = React.useCallback(
    ({ column, record }: { column: Column; record: Record }) => {
      StorageService.logActivity();
      const columnIndex = getColumnIndex(column.id);
      setColumns((_columns: Column[]) => {
        const columns = cloneColumns(_columns);
        const t = getCreatedAt();
        let newRecord: Record = {
          id: getId(),
          title: record.title,
          description: record.description,
          color: record.color,
          createdAt: t,
          updatedAt: t,
          completedAt: null,
          stamp: "",
        };
        newRecord = applyStamp(newRecord, (record.stamp || "") as Stamp, t);

        columns[columnIndex].records = [newRecord, ...columns[columnIndex].records];
        return columns;
      });
    },
    [cloneColumns, getColumnIndex]
  );

  const handleRecordEdit = React.useCallback(
    ({ column, record }: { column: Column; record: Record }) => {
      StorageService.logActivity();
      const columnIndex = getColumnIndex(column.id);
      const recordIndex = getRecordIndex(record.id, column.id);
      setColumns((_columns) => {
        const columns = cloneColumns(_columns);
        const old = columns[columnIndex].records[recordIndex!];
        const contentChanged =
          old.title !== record.title ||
          (old.description || "") !== (record.description || "") ||
          (old.color || "") !== (record.color || "");
        let updated: Record = { ...old, title: record.title, description: record.description, color: record.color };
        const t = getCreatedAt();
        if (contentChanged) updated.updatedAt = t;
        updated = applyStamp(updated, (record.stamp || "") as Stamp, t);
        // 編輯視窗裡手動改過的時間（沒改的欄位會送回原值）
        if (record.createdAt && record.createdAt !== old.createdAt) updated.createdAt = record.createdAt;
        if (record.updatedAt && record.updatedAt !== old.updatedAt) updated.updatedAt = record.updatedAt;
        if (updated.stamp === "done" && record.completedAt && record.completedAt !== old.completedAt)
          updated.completedAt = record.completedAt;
        columns[columnIndex].records[recordIndex!] = updated;
        return columns;
      });
    },
    [getColumnIndex, getRecordIndex, cloneColumns]
  );

  /** 右下角印章選單：空白 / 急件 / 完成 */
  const handleRecordStamp = React.useCallback(
    ({ column, record, stamp }: { column: Column; record: Record; stamp?: Stamp }) => {
      StorageService.logActivity();
      setColumns((_columns) => {
        const columns = cloneColumns(_columns);
        const col = columns.find((c) => c.id === column.id);
        if (!col) return _columns;
        const i = col.records!.findIndex((r) => r.id === record.id);
        if (i < 0) return _columns;
        const current = col.records![i];
        col.records![i] = applyStamp(current, stamp !== undefined ? stamp : nextStamp(current.stamp || ""));
        return columns;
      });
    },
    [cloneColumns]
  );

  const handleRecordDelete = React.useCallback(
    ({ column, record }: { column: Column; record: Record }) => {
      StorageService.logActivity();
      const columnIndex = getColumnIndex(column.id);
      const recordIndex = getRecordIndex(record.id, column.id);
      setColumns((_columns) => {
        const columns = cloneColumns(_columns);
        columns[columnIndex].records.splice(recordIndex!, 1);
        return columns;
      });
    },
    [cloneColumns, getColumnIndex, getRecordIndex]
  );

  const handleAllRecordDelete = React.useCallback(
    ({ column }: { column: Column }) => {
      const columnIndex = getColumnIndex(column.id);
      setColumns((_columns) => {
        const columns = cloneColumns(_columns);
        columns[columnIndex].records = [];
        return columns;
      });
    },
    [cloneColumns, getColumnIndex]
  );

  React.useEffect(() => {
    StorageService.setColumns(columns);
  }, [columns]);

  return (
    <>
      <Toolbar
        columns={columns}
        clearButtonDisabled={!columns.length}
        onNewColumn={handleAddColumn}
        onClearBoard={handleClearBoard}
        onReplaceBoard={handleReplaceBoard}
        searchQuery={query}
        searchResultCount={resultCount}
        onSearchChange={setQuery}
      />
      <div className={classes.toolbar} />
      <Box padding={0.5}>
        <SearchContext.Provider value={query}>
        <KanbanBoard
          columns={visibleColumns}
          emptyText={searching ? t("noSearchResult") : undefined}
          onColumnMove={handleColumnMove}
          onColumnEdit={handleColumnEdit}
          onColumnDelete={handleColumnDelete}
          onCardMove={handleCardMove}
          onAddRecord={handleAddRecord}
          onRecordEdit={handleRecordEdit}
          onRecordDelete={handleRecordDelete}
          onRecordStamp={handleRecordStamp}
          onAllRecordDelete={handleAllRecordDelete}
        />
        </SearchContext.Provider>
      </Box>
    </>
  );
};

export default KanbanBoardContainer;
