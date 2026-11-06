import React from "react";
import clsx from "clsx";
import Box from "@material-ui/core/Box";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

import { Record } from "PersonalKanban/types";
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
    textDecoration: "line-through",
    opacity: 0.75,
  },
  description: {
    display: "-webkit-box",
    "-webkit-line-clamp": 3,
    "-webkit-box-orient": "vertical",
    overflow: "hidden",
    whiteSpace: "pre-line",
    wordBreak: "break-word",
    lineHeight: 1.35,
    marginBottom: 2,
  },
  descriptionDone: {
    "-webkit-line-clamp": 1,
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
    border: `2px dashed ${theme.palette.text.disabled}`,
    color: theme.palette.text.secondary,
    fontSize: 11,
    fontWeight: 400,
    fontFamily: "inherit",
    opacity: 0,
  },
  stampImportant: {
    border: "3px double #d32f2f",
    color: "#d32f2f",
    backgroundColor: "rgba(211,47,47,.08)",
  },
  stampDone: {
    border: "3px double #2e7d32",
    color: "#2e7d32",
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,.35)",
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

  const handleStamp = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onStamp && onStamp(record);
    },
    [record, onStamp]
  );

  const done = stamp === "done";

  // 滑鼠移到時間上：顯示完整的三個時間
  const full = "YYYY/MM/DD HH:mm:ss";
  const timesTitle = [
    `${t("createdAt")}：${formatTime(createdAt, full)}`,
    updatedAt ? `${t("updatedAt")}：${formatTime(updatedAt, full)}` : "",
    completedAt ? `${t("completedAt")}：${formatTime(completedAt, full)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

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
            <IconButton icon="deleteForever" onClick={handleDelete} />
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
        <Typography component="div" variant="caption" className={classes.times} title={timesTitle}>
          {done && completedAt ? (
            <div>
              <b>{t("completedAt")}：{formatTime(completedAt, fmt)}</b>
            </div>
          ) : (
            <>
              <div>
                {t("createdAt")}：{formatTime(createdAt, fmt)}
              </div>
              {updatedAt && updatedAt !== createdAt && (
                <div>
                  {t("updatedAt")}：{formatTime(updatedAt, fmt)}
                </div>
              )}
            </>
          )}
        </Typography>
        {onStamp && (
          <button
            type="button"
            className={clsx(classes.stamp, stampClass)}
            title={t("stampHint")}
            aria-label={t("stampHint")}
            onClick={handleStamp}
          >
            {stampLabel}
          </button>
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
