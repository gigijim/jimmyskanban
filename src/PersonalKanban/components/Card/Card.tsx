import React from "react";
import clsx from "clsx";
import Box from "@material-ui/core/Box";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Tooltip from "@material-ui/core/Tooltip";
import { makeStyles } from "@material-ui/core/styles";

import { Record, Stamp } from "PersonalKanban/types";
import IconButton from "PersonalKanban/components/IconButton";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import { formatTime } from "PersonalKanban/services/Utils";

const useStyles = makeStyles((theme) => ({
  paper: {
    // 原版固定 150px；改成依內容高度，排版更緊湊
    position: "relative",
    "&:hover $stampEmpty": {
      opacity: 0.8,
    },
  },
  title: {
    // 原版 noWrap 單行截斷；改成最多兩行，顯示更多字
    display: "-webkit-box",
    "-webkit-line-clamp": 2,
    "-webkit-box-orient": "vertical",
    overflow: "hidden",
    wordBreak: "break-word",
    lineHeight: 1.3,
    marginBottom: 2,
  },
  done: {
    opacity: 0.75,
  },
  description: {
    display: "-webkit-box",
    "-webkit-line-clamp": 6,
    "-webkit-box-orient": "vertical",
    overflow: "hidden",
    whiteSpace: "pre-line",
    wordBreak: "break-word",
    lineHeight: 1.35,
    marginBottom: 2,
  },
  descriptionDone: {
    "-webkit-line-clamp": 2,
    opacity: 0.7,
  },
  footer: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },
  times: {
    lineHeight: 1.35,
    opacity: 0.75,
    fontSize: "0.68rem",
    minWidth: 0,
    cursor: "help",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  tip: {
    whiteSpace: "pre-line",
    fontSize: "0.75rem",
    lineHeight: 1.6,
  },
  deleteButton: {
    "&:hover": { color: theme.palette.error.main },
  },
  menuItem: {
    minHeight: 32,
    fontWeight: 700,
    fontSize: "0.85rem",
  },
  stamp: {
    flexShrink: 0,
    minWidth: 60,
    height: 24,
    padding: "0 6px",
    background: "transparent",
    borderRadius: 6,
    fontFamily: "'DFKai-SB', 'BiauKai', 'KaiTi', serif",
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: 1,
    cursor: "pointer",
    transform: "rotate(-8deg)",
    transition: "transform .12s, opacity .12s",
    "&:hover": { transform: "rotate(-8deg) scale(1.08)" },
    "&:focus-visible": { opacity: 1, outline: `2px solid ${theme.palette.primary.main}` },
  },
  stampEmpty: {
    minWidth: 0,
    border: `2px dashed ${theme.palette.text.disabled}`,
    color: theme.palette.text.secondary,
    fontSize: 11,
    fontWeight: 400,
    fontFamily: "inherit",
    opacity: 0,
  },
  stampImportant: {
    border: `3px double ${theme.palette.type === "dark" ? "#FF453A" : "#d32f2f"}`,
    color: theme.palette.type === "dark" ? "#FF453A" : "#d32f2f",
    backgroundColor: theme.palette.type === "dark" ? "rgba(255,69,58,.14)" : "rgba(211,47,47,.08)",
  },
  stampDone: {
    border: `3px double ${theme.palette.type === "dark" ? "#30D158" : "#2e7d32"}`,
    color: theme.palette.type === "dark" ? "#30D158" : "#2e7d32",
    borderRadius: 40,
    // 粗獷的英文印章字體
    fontFamily: "'Black Ops One', Impact, 'Arial Black', sans-serif",
    fontWeight: 400,
    fontSize: 14,
    letterSpacing: 1.5,
    backgroundColor: theme.palette.type === "dark" ? "rgba(48,209,88,.12)" : "rgba(255,255,255,.35)",
  },
}));

type CardProps = {
  record: Record;
  className?: string;
  style?: any;
  innerRef?: any;
  showEditAction?: boolean;
  showDeleteAction?: boolean;
  onDelete?: any;
  onEdit?: any;
  onStamp?: any;
};

const Card: React.FC<CardProps> = (props) => {
  const {
    record,
    className,
    innerRef,
    style,
    showEditAction,
    showDeleteAction,
    onDelete,
    onEdit,
    onStamp,
    ...rest
  } = props;
  const { title, description, createdAt, updatedAt, completedAt, stamp = "" } = record;

  const classes = useStyles();

  const { t } = useTranslation();

  const fmt = t("dateTimeFormat");

  const handleEdit = React.useCallback(() => onEdit(record), [record, onEdit]);

  const handleDelete = React.useCallback(() => onDelete(record), [
    record,
    onDelete,
  ]);

  // 點印章 → 在旁邊跳出小選單選擇狀態
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

  const handleStampClick = React.useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  }, []);

  const handleStampSelect = React.useCallback(
    (value: Stamp) => {
      setMenuAnchor(null);
      onStamp && onStamp(record, value);
    },
    [record, onStamp]
  );

  const done = stamp === "done";

  // 滑鼠移到時間上：顯示完整的三個時間
  const full = "YYYY/MM/DD HH:mm:ss";
  const timesTitle = [
    `${t("createdAt")}：${formatTime(createdAt, full) || "—"}`,
    `${t("updatedAt")}：${formatTime(updatedAt, full) || "—"}`,
    `${t("completedAt")}：${formatTime(completedAt, full) || "—"}`,
  ].join("\n");

  const stampOptions: { value: Stamp; label: string; color?: string }[] = [
    { value: "", label: t("stampNone") },
    { value: "important", label: t("stampImportant"), color: "#d32f2f" },
    { value: "done", label: t("stampDone"), color: "#2e7d32" },
  ];

  const stampLabel =
    stamp === "done" ? t("stampDone") : stamp === "important" ? t("stampImportant") : t("stamp");

  const stampClass =
    stamp === "done" ? classes.stampDone : stamp === "important" ? classes.stampImportant : classes.stampEmpty;

  return (
    <Paper
      className={clsx(classes.paper, className)}
      style={style}
      ref={innerRef}
      {...rest}
    >
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Typography title={title} className={clsx(classes.title, done && classes.done)}>
          <b>{title}</b>
        </Typography>
        <Box display="flex" alignItems="center" flexShrink={0}>
          {showEditAction && <IconButton icon="edit" onClick={handleEdit} />}
          {showDeleteAction && (
            <IconButton icon="deleteForever" className={classes.deleteButton} onClick={handleDelete} />
          )}
        </Box>
      </Box>
      {description && (
        <Typography
          title={description}
          className={clsx(classes.description, done && classes.descriptionDone)}
          variant="body2"
        >
          {description}
        </Typography>
      )}
      <div className={classes.footer}>
        {/* 只顯示建立時間；滑鼠移過去顯示建立 / 修改 / 完成時間 */}
        <Tooltip
          title={<span className={classes.tip}>{timesTitle}</span>}
          placement="bottom-start"
          enterDelay={300}
        >
          <Typography component="div" variant="caption" className={classes.times}>
            {t("createdAt")}：{formatTime(createdAt, fmt)}
          </Typography>
        </Tooltip>
        {onStamp && (
          <>
            <button
              type="button"
              className={clsx(classes.stamp, stampClass)}
              title={t("stampHint")}
              aria-label={t("stampHint")}
              aria-haspopup="menu"
              onClick={handleStampClick}
            >
              {stampLabel}
            </button>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              onClick={(e) => e.stopPropagation()}
              getContentAnchorEl={null}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              transformOrigin={{ vertical: "bottom", horizontal: "right" }}
              MenuListProps={{ dense: true }}
            >
              {stampOptions.map((o) => (
                <MenuItem
                  key={o.value || "none"}
                  selected={stamp === o.value}
                  className={classes.menuItem}
                  style={o.color ? { color: o.color } : undefined}
                  onClick={() => handleStampSelect(o.value)}
                >
                  {o.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </div>
    </Paper>
  );
};

Card.defaultProps = {
  showDeleteAction: true,
  showEditAction: true,
};

export default Card;
