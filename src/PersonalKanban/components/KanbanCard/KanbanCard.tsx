import React from "react";
import { Draggable } from "react-beautiful-dnd";

import Card from "PersonalKanban/components/Card";
import { Record } from "PersonalKanban/types";
import {
  RecordColor,
  DarkRecordColor,
  DoneAccentColor,
  DarkDoneAccentColor,
  DONE_OVERLAY,
  DARK_DONE_OVERLAY,
} from "PersonalKanban/enums";
import { useTheme } from "PersonalKanban/providers/ThemeProvider";

type KanbanCardProps = {
  record: Record;
  index: number;
  className?: string;
  onEdit?: any;
  onDelete?: any;
  onStamp?: any;
};

const KanbanCard: React.FC<KanbanCardProps> = (props) => {
  const { record, index, className, onEdit, onDelete, onStamp } = props;

  const recordColor = (record.color || "Default") as keyof typeof RecordColor;

  const { darkTheme } = useTheme();

  const done = record.stamp === "done";

  const background = darkTheme ? DarkRecordColor[recordColor] : RecordColor[recordColor];

  // 已完成：原本底色 + 灰色濾層，左側留一條原本顏色的色帶
  const doneStyle = done
    ? {
        backgroundImage: darkTheme ? DARK_DONE_OVERLAY : DONE_OVERLAY,
        borderLeft: `6px solid ${
          (darkTheme ? DarkDoneAccentColor : DoneAccentColor)[recordColor] ||
          (darkTheme ? DarkDoneAccentColor : DoneAccentColor).Default
        }`,
      }
    : null;

  return (
    <Draggable draggableId={record.id} index={index}>
      {(provided) => (
        <Card
          key={record.id}
          innerRef={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            backgroundColor: background,
            ...doneStyle,
          }}
          record={record}
          className={className}
          onEdit={onEdit}
          onDelete={onDelete}
          onStamp={onStamp}
        />
      )}
    </Draggable>
  );
};

export default KanbanCard;
