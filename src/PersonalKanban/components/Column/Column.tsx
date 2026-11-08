import React from "react";
import clsx from "clsx";
import Box from "@material-ui/core/Box";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Divider from "@material-ui/core/Divider";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import { makeStyles, useTheme as useMuiTheme } from "@material-ui/core/styles";
import WarningIcon from "@material-ui/icons/Warning";

import Card from "PersonalKanban/components/Card";
import IconButton from "PersonalKanban/components/IconButton";
import ColumnForm from "PersonalKanban/components/ColumnForm";
import RecordForm from "PersonalKanban/components/RecordForm";
import { ColumnColor, DarkColumnColor } from "PersonalKanban/enums";
import { Record, Column as ColumnType } from "PersonalKanban/types";
import { useTheme } from "PersonalKanban/providers/ThemeProvider";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import { useSyncedHeight } from "PersonalKanban/components/KanbanColumn/ActiveAreaHeight";

const MIN_COLUMN_WIDTH = 150;
const MAX_COLUMN_WIDTH = 900;

const useColumnHeaderStyles = makeStyles((theme) => {
  // 標題列固定在畫面上方（工具列下面）：top 跟著工具列高度
  const tb: any = theme.mixins.toolbar;
  const top: any = { top: tb.minHeight };
  Object.keys(tb)
    .filter((k) => k.startsWith("@media"))
    .forEach((k) => (top[k] = { top: tb[k].minHeight }));
  return {
    sticky: {
      position: "sticky",
      ...top,
      zIndex: 3,
      // 蓋住捲上來的卡片：用欄位本身的底色，並延伸到欄位內距
      backgroundColor: "inherit",
      margin: -8,
      marginBottom: 0,
      padding: "8px 8px 0",
      borderRadius: "4px 4px 0 0",
    },
    title: {
      // 完整顯示標題（可換行），不截斷
      fontSize: 17,
      fontWeight: 800,
      letterSpacing: 0.2,
      lineHeight: 1.3,
      wordBreak: "break-word",
      flex: 1,
      minWidth: 0,
      paddingTop: 2,
    },
    add: {
      padding: 2,
      marginLeft: 2,
    },
    divider: {
      marginTop: theme.spacing(0.5),
      marginBottom: theme.spacing(1),
    },
  };
});

type ColumnHeaderProps = {
  columnId?: string;
  title: string;
  description?: string;
  onEdit?: any;
  onDelete?: any;
  onAddRecord?: any;
  disableAddRecordAction?: boolean;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  showAddRecordAction?: boolean;
};

export const ColumnHeader: React.FC<ColumnHeaderProps> = (props) => {
  const {
    columnId = "",
    title,
    description,
    showEditAction,
    showAddRecordAction,
    disableAddRecordAction,
    onEdit,
    onAddRecord,
  } = props;

  const classes = useColumnHeaderStyles();
  const { t } = useTranslation();

  // 各欄標題列等高（取最高的），下方的進行中 / 已完成區才對齊
  const { minHeight, contentRef } = useSyncedHeight("header", columnId);

  return (
    <div className={classes.sticky}>
      <div style={{ minHeight }}>
        <div ref={contentRef}>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" marginBottom={0.5}>
            {/* 雙擊標題 → 編輯欄位（原本的鉛筆按鈕已移除） */}
            <Typography
              variant="subtitle1"
              title={showEditAction ? `${title}
（${t("editColumnHint")}）` : title}
              className={classes.title}
              style={showEditAction ? { cursor: "pointer", userSelect: "none" } : undefined}
              onDoubleClick={showEditAction ? onEdit : undefined}
            >
              <b>{title}</b>
            </Typography>
            <Box display="flex" alignItems="center" flexShrink={0}>
              {showAddRecordAction && (
                <IconButton
                  icon="addCircle"
                  color="primary"
                  className={classes.add}
                  title={t("addRecord")}
                  aria-label={t("addRecord")}
                  disabled={disableAddRecordAction}
                  onClick={onAddRecord}
                  iconProps={{ style: { fontSize: 30 } }}
                />
              )}
            </Box>
          </Box>
          {description && description.trim() && (
            <Typography variant="body2" title={description} gutterBottom style={{ wordBreak: "break-word" }}>
              {description}
            </Typography>
          )}
        </div>
      </div>
      <Divider className={classes.divider} />
    </div>
  );
};

ColumnHeader.defaultProps = { showEditAction: true, showDeleteAction: false, showAddRecordAction: true };

const useColumnActionStyles = makeStyles((theme) => ({
  divider: {
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
  },
}));

type ColumnActionProps = {
  onAddRecord?: any;
  onDeleteAllRecord?: any;
  showAddRecordAction?: boolean;
  showAllRecordDeleteAction?: boolean;
  disableAllRecordDeleteAction?: boolean;
  disableAddRecordAction?: boolean;
};

export const ColumnAction: React.FC<ColumnActionProps> = (props) => {
  const {
    showAddRecordAction,
    showAllRecordDeleteAction,
    disableAllRecordDeleteAction,
    disableAddRecordAction,
    onAddRecord,
    onDeleteAllRecord,
  } = props;
  const classes = useColumnActionStyles();
  return (
    <>
      {showAddRecordAction && (
        <IconButton
          icon="add"
          disabled={disableAddRecordAction}
          onClick={onAddRecord}
        />
      )}
      {showAllRecordDeleteAction && (
        <IconButton
          icon="delete"
          disabled={disableAllRecordDeleteAction}
          onClick={onDeleteAllRecord}
        />
      )}

      <Divider className={classes.divider} />
    </>
  );
};

ColumnAction.defaultProps = {
  showAddRecordAction: true,
  showAllRecordDeleteAction: true,
};

const useColumnCardListStyles = makeStyles((theme) => ({
  card: {
    marginBottom: theme.spacing(),
  },
}));

type ColumnCardListProps = {
  column: ColumnType;
  innerRef?: any;
  CardComponent?: any;
  onRecordEdit?: any;
  onRecordDelete?: any;
  onRecordStamp?: any;
  emptyText?: string;
};

export const ColumnCardList: React.FC<ColumnCardListProps> = (props) => {
  const {
    column,
    innerRef,
    CardComponent = Card,
    onRecordEdit,
    onRecordDelete,
    onRecordStamp,
    emptyText,
  } = props;
  const { records = [] } = column;

  const { t } = useTranslation();

  const classes = useColumnCardListStyles();

  return (
    <div ref={innerRef}>
      {records && records.length ? (
        records.map((record: Record, index) => (
          <CardComponent
            key={record.id}
            record={record}
            className={classes.card}
            index={index}
            onEdit={onRecordEdit}
            onDelete={onRecordDelete}
            onStamp={onRecordStamp}
          />
        ))
      ) : (
        <Typography variant={emptyText ? "body2" : "body1"} color={emptyText ? "textSecondary" : "initial"}>
          {emptyText || t("noRecord")}
        </Typography>
      )}
    </div>
  );
};

const useColumnFooterStyles = makeStyles((theme) => ({
  divider: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
}));

type ColumnFooterProps = {
  content?: string;
};

export const ColumnFooter: React.FC<ColumnFooterProps> = (props) => {
  const { content } = props;

  const classes = useColumnFooterStyles();
  return (
    <>
      <Divider className={classes.divider} />
      <Typography variant="caption" component="p" title={content} noWrap>
        {content}
      </Typography>
    </>
  );
};

const useColumnStyles = makeStyles((theme) => ({
  paper: (props: any) => ({
    backgroundColor: props.backgroundColor,
    position: "relative",
  }),
  // 欄位右側邊緣：拖曳調整欄寬，雙擊恢復自動寬度
  // （用 <button> 是因為 react-beautiful-dnd 不會從按鈕開始拖曳欄位）
  resizer: {
    position: "absolute",
    top: 0,
    right: -5,
    width: 10,
    height: "100%",
    padding: 0,
    border: 0,
    background: "transparent",
    cursor: "col-resize",
    zIndex: 4,
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 4,
      width: 2,
      borderRadius: 1,
      background: "transparent",
      transition: "background .15s",
    },
    "&:hover::after, &$resizing::after": {
      background: theme.palette.primary.main,
    },
    "&:focus": { outline: "none" },
  },
  resizing: {},
}));

type ColumnProps = {
  column: ColumnType;
  className?: string;
  innerRef?: any;
  onEdit?: any;
  onDelete?: any;
  onAddRecord?: any;
  onRecordEdit?: any;
  onRecordDelete?: any;
  onRecordStamp?: any;
  onAllRecordDelete?: any;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  showAddRecordAction?: boolean;
  showDeleteAllRecordAction?: boolean;
  ColumnHeaderComponent?: any;
  ColumnActionComponent?: any;
  ColumnCardListComponent?: any;
  ColumnFooterComponent?: any;
};

const Column: React.FC<ColumnProps> = (props) => {
  const {
    column,
    className,
    innerRef,
    onEdit,
    onDelete,
    onAddRecord,
    onAllRecordDelete,
    showDeleteAction,
    showEditAction,
    onRecordEdit,
    onRecordDelete,
    onRecordStamp,
    showAddRecordAction,
    showDeleteAllRecordAction,
    ColumnHeaderComponent = ColumnHeader,
    ColumnActionComponent = null,
    ColumnCardListComponent = ColumnCardList,
    ColumnFooterComponent = ColumnFooter,
    ...rest
  } = props;

  const {
    title,
    description,
    caption,
    color,
    records = [],
    width,
  } = column;

  const disableAddRecordAction = false;

  const disableAllRecordDeleteAction = !records.length;

  const columnColor = color as keyof typeof ColumnColor;

  const { darkTheme } = useTheme();

  const { t } = useTranslation();

  const classes = useColumnStyles({
    backgroundColor: darkTheme
      ? DarkColumnColor[columnColor]
      : ColumnColor[columnColor],
  });

  const muiTheme = useMuiTheme();
  const [dialog, setDialog] = React.useState<{ open: boolean; title: React.ReactNode; content: any; actions: any }>({
    open: false,
    title: "",
    content: null,
    actions: null,
  });

  const handleDelete = React.useCallback(
    (e) => {
      onDelete && onDelete({ column, e });
    },
    [column, onDelete]
  );

  const handleEdit = React.useCallback(
    (column: ColumnType) => {
      onEdit && onEdit({ column });
    },
    [onEdit]
  );

  const handleAddRecord = React.useCallback(
    (record: Record) => {
      onAddRecord && onAddRecord({ column, record });
    },
    [column, onAddRecord]
  );

  const handleRecordEdit = React.useCallback(
    (record: Record) => {
      onRecordEdit({ column, record });
    },
    [column, onRecordEdit]
  );

  const handleRecordDelete = React.useCallback(
    (record: Record) => {
      onRecordDelete({ column, record });
    },
    [column, onRecordDelete]
  );

  const handleRecordStamp = React.useCallback(
    (record: Record, stamp: string) => {
      onRecordStamp && onRecordStamp({ column, record, stamp });
    },
    [column, onRecordStamp]
  );

  const handleAllRecordDelete = React.useCallback(() => {
    onAllRecordDelete({ column });
  }, [column, onAllRecordDelete]);

  const handleOpenDialog = React.useCallback(({ content, title, actions }) => {
    setDialog({ content, title, actions, open: true });
  }, []);

  const handleCloseDialog = React.useCallback(() => {
    setDialog(() => ({ content: null, title: "", actions: null, open: false }));
  }, []);

  const handleOpenDeleteDialog = React.useCallback(() => {
    const error = muiTheme.palette.error.main;
    const count = (column.records || []).length;
    const content = (
      <>
        <Typography gutterBottom>
          {t("deleteColumnWarning", { title: column.title, count })}
        </Typography>
        <Typography style={{ color: error, fontWeight: 700 }}>{t("deleteColumnIrreversible")}</Typography>
      </>
    );
    const title = (
      <Box display="flex" alignItems="center" style={{ color: error, gap: 8 }}>
        <WarningIcon /> {t("deleteColumnWarningTitle")}
      </Box>
    );
    const actions = (
      <>
        <Button variant="outlined" autoFocus onClick={handleCloseDialog}>
          {t("cancel")}
        </Button>
        &nbsp;
        <Button
          variant="contained"
          style={{ backgroundColor: error, color: muiTheme.palette.error.contrastText }}
          onClick={(e) => {
            handleCloseDialog();
            handleDelete(e);
          }}
        >
          {t("delete")}
        </Button>
      </>
    );

    handleOpenDialog({ content, actions, title });
  }, [t, column, muiTheme, handleOpenDialog, handleDelete, handleCloseDialog]);

  const handleOpenEditDialog = React.useCallback(() => {
    const content = (
      <ColumnForm
        column={column}
        formTitle={t("editColumn")}
        onSubmit={(column: any) => {
          handleCloseDialog();
          handleEdit(column);
        }}
        onCancel={handleCloseDialog}
        onDelete={onDelete ? handleOpenDeleteDialog : undefined}
      ></ColumnForm>
    );

    handleOpenDialog({ content });
  }, [column, t, onDelete, handleOpenDialog, handleCloseDialog, handleEdit, handleOpenDeleteDialog]);

  // ---- 拖曳右側邊緣調整欄寬（放開滑鼠才存檔）
  const paperRef = React.useRef<HTMLElement | null>(null);
  const [dragWidth, setDragWidth] = React.useState<number | null>(null);

  const setRefs = React.useCallback(
    (el: HTMLElement | null) => {
      paperRef.current = el;
      if (typeof innerRef === "function") innerRef(el);
      else if (innerRef) innerRef.current = el;
    },
    [innerRef]
  );

  const handleResizeStart = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0 || !paperRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = paperRef.current.getBoundingClientRect().width;
      let latest = startWidth;
      const onMove = (ev: MouseEvent) => {
        latest = Math.round(Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, startWidth + ev.clientX - startX)));
        setDragWidth(latest);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        setDragWidth(null);
        if (Math.abs(latest - startWidth) >= 2) onEdit && onEdit({ column: { ...column, width: latest } });
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [column, onEdit]
  );

  const handleResizeReset = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (width) onEdit && onEdit({ column: { ...column, width: 0 } });
    },
    [column, width, onEdit]
  );

  const effectiveWidth = dragWidth || width;
  const widthStyle = effectiveWidth
    ? { flex: `0 0 ${effectiveWidth}px`, width: effectiveWidth, minWidth: effectiveWidth, maxWidth: effectiveWidth }
    : null;
  const { style: rbdStyle, ...paperRest } = rest as any;

  const handleOpenAddRecordDialog = React.useCallback(() => {
    const content = (
      <RecordForm
        onSubmit={(record: Record) => {
          handleCloseDialog();
          handleAddRecord(record);
        }}
        onCancel={handleCloseDialog}
      ></RecordForm>
    );

    handleOpenDialog({ content });
  }, [handleOpenDialog, handleCloseDialog, handleAddRecord]);

  const handleOpenEditRecordDialog = React.useCallback(
    (record: Record) => {
      const content = (
        <RecordForm
          record={record}
          formTitle={t("editRecord")}
          onSubmit={(record: Record) => {
            handleCloseDialog();
            handleRecordEdit(record);
          }}
          onCancel={handleCloseDialog}
        ></RecordForm>
      );

      handleOpenDialog({ content });
    },
    [t, handleOpenDialog, handleCloseDialog, handleRecordEdit]
  );

  const handleOpenDeleteRecordDialog = React.useCallback(
    (record: Record) => {
      const content = <Typography>{t("deleteRecordConfirmation")}</Typography>;
      const actions = (
        <>
          <Button variant="outlined" onClick={handleCloseDialog}>
            {t("cancel")}
          </Button>
          &nbsp;
          <Button
            variant="contained"
            color="primary"
            onClick={(e) => {
              handleCloseDialog();
              handleRecordDelete(record);
            }}
          >
            {t("delete")}
          </Button>
        </>
      );

      handleOpenDialog({ content, actions, title: t("deleteRecord") });
    },
    [t, handleOpenDialog, handleCloseDialog, handleRecordDelete]
  );

  const handleOpenDeleteAllRecordDialog = React.useCallback(
    (record: Record) => {
      const content = (
        <Typography>{t("deleteAllRecordConfirmation")}</Typography>
      );
      const actions = (
        <>
          <Button variant="outlined" onClick={handleCloseDialog}>
            {t("cancel")}
          </Button>
          &nbsp;
          <Button
            variant="contained"
            color="primary"
            onClick={(e) => {
              handleCloseDialog();
              handleAllRecordDelete();
            }}
          >
            {t("delete")}
          </Button>
        </>
      );

      handleOpenDialog({ content, actions, title: t("deleteAllRecord") });
    },
    [t, handleOpenDialog, handleCloseDialog, handleAllRecordDelete]
  );

  return (
    <Paper
      elevation={4}
      className={clsx(className, classes.paper)}
      ref={setRefs}
      style={{ ...rbdStyle, ...widthStyle }}
      {...paperRest}
    >
      <ColumnHeaderComponent
        columnId={column.id}
        title={title}
        description={description}
        showEditAction={showEditAction}
        showAddRecordAction={showAddRecordAction}
        disableAddRecordAction={disableAddRecordAction}
        onEdit={handleOpenEditDialog}
        onAddRecord={handleOpenAddRecordDialog}
      />
      {ColumnActionComponent && (
        <ColumnActionComponent
          showAddRecordAction={showAddRecordAction}
          showDeleteAllRecordAction={showDeleteAllRecordAction}
          disableAddRecordAction={disableAddRecordAction}
          disableAllRecordDeleteAction={disableAllRecordDeleteAction}
          onAddRecord={handleOpenAddRecordDialog}
          onDeleteAllRecord={handleOpenDeleteAllRecordDialog}
        />
      )}
      <ColumnCardListComponent
        column={column}
        onRecordEdit={handleOpenEditRecordDialog}
        onRecordDelete={handleOpenDeleteRecordDialog}
        onRecordStamp={onRecordStamp ? handleRecordStamp : undefined}
      />
      <ColumnFooterComponent content={caption} />
      {onEdit && (
        <button
          type="button"
          tabIndex={-1}
          className={clsx(classes.resizer, dragWidth && classes.resizing)}
          title={t("resizeColumn")}
          aria-label={t("resizeColumn")}
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResizeReset}
        />
      )}
      <Dialog open={dialog.open} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{dialog.title}</DialogTitle>
        <DialogContent>{dialog.content}</DialogContent>
        <DialogActions>{dialog.actions}</DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Column;
