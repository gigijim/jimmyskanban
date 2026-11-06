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
    marginBottom: theme.spacing(0.5),
    opacity: 0.85,
  },
  dropArea: {
    minHeight: 40,
    borderRadius: 4,
    transition: "background-color .15s",
  },
  dropping: {
    backgroundColor: "rgba(0,0,0,0.06)",
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
 *   上：進行中（可手動排序，受 WIP 上限限制）
 *   下：已完成（依完成時間新→舊自動排序；拖進來 = 標記已完成）
 */
const KanbanColumnCardList: React.FC<KanbanColumnCardListProps> = (props) => {
  const { column, onRecordEdit, onRecordDelete, onRecordStamp } = props;
  const { id: columnId, records = [], wipEnabled, wipLimit = 0 } = column;
  const { t } = useTranslation();
  const classes = useSectionStyles();

  const { active, done } = React.useMemo(() => splitRecords(records), [records]);
  const activeColumn = React.useMemo(() => ({ ...column, records: active }), [column, active]);
  const doneColumn = React.useMemo(() => ({ ...column, records: done }), [column, done]);

  const isDropDisabled = Boolean(wipEnabled) && wipLimit <= active.length;

  return (
    <>
      <Typography variant="caption" component="div" className={classes.label}>
        <b>▶ {t("inProgress")}</b>
        <span>{wipEnabled ? `${active.length} / ${wipLimit}` : active.length}</span>
      </Typography>
      <Droppable droppableId={columnId} isDropDisabled={isDropDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`${classes.dropArea} ${snapshot.isDraggingOver ? classes.dropping : ""}`}
          >
            <KanbanInnerColumnCardList
              column={activeColumn}
              onRecordEdit={onRecordEdit}
              onRecordDelete={onRecordDelete}
              onRecordStamp={onRecordStamp}
            />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <Divider className={classes.divider} />
      <Typography variant="caption" component="div" className={classes.label}>
        <b>✔ {t("completed")}</b>
        <span>{done.length}</span>
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
    caption: column.wipEnabled
      ? `${t("wipLimit")} :${column.wipLimit}`
      : `${t("createdAt")}：${formatTime(column.createdAt, t("dateTimeFormat")) || column.createdAt || ""}`,
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
