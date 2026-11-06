import React from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";

import Board from "PersonalKanban/components/Board";
import KanbanColumn from "PersonalKanban/components/KanbanColumn";
import { Column } from "PersonalKanban/types";
import { DONE_SUFFIX, splitRecords } from "PersonalKanban/services/Utils";

type KanbanBoardProps = {
  columns: Column[];
  onCardMove?: any;
  onColumnMove?: any;
  onColumnEdit?: any;
  onColumnDelete?: any;
  onAddRecord?: any;
  onRecordEdit?: any;
  onRecordDelete?: any;
  onRecordStamp?: any;
  onAllRecordDelete?: any;
  ColumnComponent?: any;
};

/** droppableId → 欄位 id 與區塊（進行中 / 已完成） */
const parseDroppable = (droppableId: string) => {
  const done = droppableId.endsWith(DONE_SUFFIX);
  return {
    columnId: done ? droppableId.slice(0, -DONE_SUFFIX.length) : droppableId,
    done,
  };
};

const KanbanBoard: React.FC<KanbanBoardProps> = (props) => {
  const {
    columns,
    onCardMove,
    onColumnMove,
    onColumnEdit,
    onColumnDelete,
    onAddRecord,
    onRecordEdit,
    onRecordDelete,
    onRecordStamp,
    onAllRecordDelete,
    ColumnComponent = KanbanColumn,
  } = props;

  const getColumnById = React.useCallback(
    (columnId) => columns.find((column) => column.id === columnId),
    [columns]
  );

  const getColumnByIndex = React.useCallback((index) => columns[index], [
    columns,
  ]);

  const handleDragEnd = React.useCallback(
    (result) => {
      const { source, destination, type } = result;

      if (!destination) {
        // Invalid Destination
        return;
      }

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        // Drop position is same as original
        return;
      }

      if (type === "COLUMN") {
        onColumnMove({
          column: getColumnByIndex(source.index),
          index: destination.index,
        });
        return;
      }

      const from = parseDroppable(source.droppableId);
      const to = parseDroppable(destination.droppableId);

      // 完成區內部依時間排序，不需要手動排序
      if (from.columnId === to.columnId && from.done && to.done) return;

      const sourceColumn = getColumnById(from.columnId);
      const { active, done } = splitRecords(sourceColumn?.records);
      const record = (from.done ? done : active)[source.index];
      if (!record) return;

      onCardMove({
        source: sourceColumn,
        column: getColumnById(to.columnId),
        record,
        index: destination.index,
        toDone: to.done,
      });
    },
    [onColumnMove, onCardMove, getColumnByIndex, getColumnById]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="BOARD" type="COLUMN" direction="horizontal">
        {(provided) => (
          <>
            <Board
              innerRef={provided.innerRef}
              ColumnComponent={ColumnComponent}
              {...provided.droppableProps}
              columns={columns}
              placeholder={provided.placeholder}
              onColumnEdit={onColumnEdit}
              onColumnDelete={onColumnDelete}
              onAddRecord={onAddRecord}
              onRecordEdit={onRecordEdit}
              onRecordDelete={onRecordDelete}
              onRecordStamp={onRecordStamp}
              onAllRecordDelete={onAllRecordDelete}
            />
          </>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default KanbanBoard;
