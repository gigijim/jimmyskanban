import React from "react";
import { useTranslation } from "react-i18next";
import { Draggable, Droppable } from "react-beautiful-dnd";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

import KanbanCard from "PersonalKanban/components/KanbanCard";
import Column, { ColumnCardList } from "PersonalKanban/components/Column";
import { Column as ColumnType } from "PersonalKanban/types";
import { DONE_SUFFIX, formatTime, splitRecords } from "PersonalKanban/services/Utils";
import { DONE_PREVIEW } from "PersonalKanban/constants";
import { useActiveAreaHeight } from "PersonalKanban/components/KanbanColumn/ActiveAreaHeight";
import { useSearchQuery } from "PersonalKanban/components/KanbanColumn/SearchContext";

// 每個欄位「已完成」區是否展開全部：只是畫面偏好，存在瀏覽器，不進備份
const EXPAND_KEY = "jimmyskanban.doneExpanded";
const readExpanded = (): { [id: string]: boolean } => {
  try {
    return JSON.parse(localStorage.getItem(EXPAND_KEY) || "{}") || {};
  } catch (e) {
    return {};
  }
};
const writeExpanded = (id: string, value: boolean) => {
  try {
    const all = readExpanded();
    if (value) all[id] = true;
    else delete all[id];
    localStorage.setItem(EXPAND_KEY, JSON.stringify(all));
  } catch (e) {
    /* 無法寫入時只影響本次畫面 */
  }
};

type KanbanInnerColumnCardListProps = {
  column: ColumnType;
  emptyText?: string;
  onRecordEdit?: any;
  onRecordDelete?: any;
  onRecordStamp?: any;
};

const KanbanInnerColumnCardList: React.FC<KanbanInnerColumnCardListProps> = React.memo(
  (props) => {
    const { column, emptyText, onRecordEdit, onRecordDelete, onRecordStamp } = props;
    return (
      <ColumnCardList
        column={column}
        CardComponent={KanbanCard}
        emptyText={emptyText}
        onRecordEdit={onRecordEdit}
        onRecordDelete={onRecordDelete}
        onRecordStamp={onRecordStamp}
      />
    );
  }
);

const useSectionStyles = makeStyles((theme) => ({
  label: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(0.75),
  },
  // 區段標籤：進行中（藍）/ 已完成（綠），彩色膠囊一眼可辨
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.5,
    color: "#fff",
    letterSpacing: 0.5,
  },
  pillActive: {
    backgroundColor: theme.palette.type === "dark" ? "#0A84FF" : "#1565C0",
  },
  pillDone: {
    backgroundColor: theme.palette.type === "dark" ? "#248A3D" : "#2E7D32",
  },
  // 便條數：與標籤同色的圓形徽章，數字加大加粗
  count: {
    minWidth: 26,
    height: 26,
    padding: "0 8px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    fontWeight: 800,
    color: "#fff",
    fontVariantNumeric: "tabular-nums",
    boxShadow: theme.palette.type === "dark" ? "none" : "0 1px 2px rgba(0,0,0,.25)",
  },
  dropArea: {
    minHeight: 40,
    borderRadius: 4,
    transition: "background-color .15s",
  },
  toggle: {
    display: "block",
    width: "100%",
    marginBottom: theme.spacing(0.5),
    padding: "4px 0",
    border: `1px dashed ${theme.palette.text.disabled}`,
    borderRadius: 4,
    background: "transparent",
    color: theme.palette.text.secondary,
    font: "inherit",
    fontSize: "0.75rem",
    cursor: "pointer",
    "&:hover": { backgroundColor: theme.palette.action.hover },
  },
  dropping: {
    backgroundColor: theme.palette.action.hover,
  },
  divider: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
}));

type KanbanColumnCardListProps = {
  column: ColumnType;
  onRecordEdit?: any;
  onRecordDelete?: any;
  onRecordStamp?: any;
};

/**
 * 欄位內分成上下兩個區塊：
 *   上：進行中（可手動排序）
 *   下：已完成（依完成時間新→舊自動排序；拖進來 = 標記已完成）
 */
const KanbanColumnCardList: React.FC<KanbanColumnCardListProps> = (props) => {
  const { column, onRecordEdit, onRecordDelete, onRecordStamp } = props;
  const { id: columnId, records = [] } = column;
  const { t } = useTranslation();
  const classes = useSectionStyles();

  const { active, done } = React.useMemo(() => splitRecords(records), [records]);
  const activeColumn = React.useMemo(() => ({ ...column, records: active }), [column, active]);
  // 已完成區預設只顯示最新 DONE_PREVIEW 張（依完成時間新→舊），可展開全部
  const [expanded, setExpanded] = React.useState(() => Boolean(readExpanded()[columnId]));
  const toggleExpanded = React.useCallback(() => {
    setExpanded((v) => {
      writeExpanded(columnId, !v);
      return !v;
    });
  }, [columnId]);
  const searching = Boolean(useSearchQuery().trim());
  const showAll = expanded || searching;
  const doneColumn = React.useMemo(
    () => ({ ...column, records: showAll ? done : done.slice(0, DONE_PREVIEW) }),
    [column, done, showAll]
  );


  const { minHeight, contentRef } = useActiveAreaHeight(columnId);

  return (
    <>
      <Typography variant="caption" component="div" className={classes.label}>
        <span className={`${classes.pill} ${classes.pillActive}`}>▶ {t("inProgress")}</span>
        <span className={`${classes.count} ${classes.pillActive}`} title={t("inProgress")}>{active.length}</span>
      </Typography>
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`${classes.dropArea} ${snapshot.isDraggingOver ? classes.dropping : ""}`}
            style={{ minHeight }}
          >
            <div ref={contentRef}>
              <KanbanInnerColumnCardList
                column={activeColumn}
                onRecordEdit={onRecordEdit}
                onRecordDelete={onRecordDelete}
                onRecordStamp={onRecordStamp}
              />
            </div>
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <Divider className={classes.divider} />
      <Typography variant="caption" component="div" className={classes.label}>
        <span className={`${classes.pill} ${classes.pillDone}`}>✔ {t("completed")}</span>
        <span className={`${classes.count} ${classes.pillDone}`} title={t("completed")}>{done.length}</span>
      </Typography>
      <Droppable droppableId={`${columnId}${DONE_SUFFIX}`}>
        {(provided, snapshot) => (
          <Box>
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`${classes.dropArea} ${snapshot.isDraggingOver ? classes.dropping : ""}`}
            >
              <KanbanInnerColumnCardList
                column={doneColumn}
                emptyText={t("noCompletedRecord")}
                onRecordEdit={onRecordEdit}
                onRecordDelete={onRecordDelete}
                onRecordStamp={onRecordStamp}
              />
              {provided.placeholder}
            </div>
            {!searching && done.length > DONE_PREVIEW && (
              <button type="button" className={classes.toggle} onClick={toggleExpanded}>
                {expanded ? t("collapseDone") : t("showAllDone", { n: done.length - DONE_PREVIEW })}
              </button>
            )}
          </Box>
        )}
      </Droppable>
    </>
  );
};

type KanbanColumnProps = {
  column: ColumnType;
  index: number;
  className?: string;
  onEdit?: any;
  onDelete?: any;
  onAddRecord?: any;
  onRecordEdit?: any;
  onRecordDelete?: any;
  onRecordStamp?: any;
  onAllRecordDelete?: any;
};

const KanbanColumn: React.FC<KanbanColumnProps> = (props) => {
  const {
    column,
    index,
    className,
    onEdit,
    onDelete,
    onAddRecord,
    onRecordEdit,
    onRecordDelete,
    onRecordStamp,
    onAllRecordDelete,
  } = props;

  const { t } = useTranslation();

  const _column = Object.assign({}, column, {
    caption: `${t("createdAt")}：${formatTime(column.createdAt, t("dateTimeFormat")) || column.createdAt || ""}`,
  });

  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided) => (
        <Column
          innerRef={provided.innerRef}
          column={_column}
          className={className}
          ColumnCardListComponent={KanbanColumnCardList}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddRecord={onAddRecord}
          onRecordEdit={onRecordEdit}
          onRecordDelete={onRecordDelete}
          onRecordStamp={onRecordStamp}
          onAllRecordDelete={onAllRecordDelete}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        />
      )}
    </Draggable>
  );
};

export default KanbanColumn;
