import React from "react";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

import Column from "PersonalKanban/components/Column";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import { Column as ColumnType } from "PersonalKanban/types";
import { COLUMN_WIDTH, COLUMN_MIN_WIDTH } from "PersonalKanban/constants";

const useBoardStyles = makeStyles((theme) => ({
  // 欄位寬度隨視窗自動分配：欄位少時加寬（最多 COLUMN_WIDTH），欄位多時縮窄（最少 COLUMN_MIN_WIDTH）
  root: {
    minHeight: "calc(100vh - 80px)",
    display: "flex",
    alignItems: "flex-start",
    width: "100%",
  },
  column: {
    flex: `1 0 ${COLUMN_MIN_WIDTH}px`,
    minWidth: COLUMN_MIN_WIDTH,
    maxWidth: COLUMN_WIDTH,
    margin: theme.spacing(0.5),
    height: "fit-content",
  },
}));

type BoardProps = {
  columns: ColumnType[];
  innerRef: any;
  ColumnComponent: any;
  placeholder?: any;
  onColumnEdit?: any;
  onColumnDelete?: any;
  onAddRecord?: any;
  onRecordEdit?: any;
  onRecordDelete?: any;
  onRecordStamp?: any;
  onAllRecordDelete?: any;
};

const Board: React.FC<BoardProps> = (props) => {
  const {
    columns,
    innerRef,
    ColumnComponent = Column,
    placeholder,
    onColumnEdit,
    onColumnDelete,
    onAddRecord,
    onRecordEdit,
    onRecordDelete,
    onRecordStamp,
    onAllRecordDelete,
    ...rest
  } = props;

  const classes = useBoardStyles();

  const { t } = useTranslation();

  return (
    <div className={classes.root} ref={innerRef} {...rest}>
      {columns && columns.length ? (
        columns.map((column, index) => (
          <ColumnComponent
            index={index}
            key={column.id}
            column={column}
            className={classes.column}
            onEdit={onColumnEdit}
            onDelete={onColumnDelete}
            onAddRecord={onAddRecord}
            onRecordEdit={onRecordEdit}
            onRecordDelete={onRecordDelete}
            onRecordStamp={onRecordStamp}
            onAllRecordDelete={onAllRecordDelete}
          />
        ))
      ) : (
        <Box display="flex" justifyContent="center">
          <Typography>{t("noColumn")}</Typography>
        </Box>
      )}
      {placeholder}
    </div>
  );
};

export default Board;
