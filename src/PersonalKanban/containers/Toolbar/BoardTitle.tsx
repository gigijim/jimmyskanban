import React from "react";
import InputBase from "@material-ui/core/InputBase";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

import { useTranslation } from "PersonalKanban/providers/TranslationProvider";

/** 自訂標題只存在這台裝置（localStorage），不進備份 */
const KEY = "jimmyskanban.title";
const MAX = 60;

const load = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};
const save = (v: string) => {
  try {
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
  } catch {
    /* 無法儲存時只在這次顯示 */
  }
};

const useStyles = makeStyles((theme) => ({
  title: {
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "32vw",
  },
  input: {
    fontWeight: 700,
    fontSize: theme.typography.h6.fontSize,
    width: "min(22em, 32vw)",
    borderBottom: `2px solid ${theme.palette.primary.main}`,
  },
}));

const BoardTitle: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const [custom, setCustom] = React.useState(load);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const fallback = String(t("personalKanban"));
  const title = custom || fallback;

  const start = () => {
    setDraft(title);
    setEditing(true);
  };
  const commit = () => {
    const v = draft.trim().slice(0, MAX);
    const next = v === fallback ? "" : v; // 空白或等於預設 → 還原預設
    save(next);
    setCustom(next);
    setEditing(false);
  };

  if (editing) {
    return (
      <InputBase
        autoFocus
        value={draft}
        inputProps={{ maxLength: MAX, "aria-label": String(t("boardTitleEdit")) }}
        className={classes.input}
        placeholder={fallback}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => (e.target as HTMLInputElement).select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <Typography
      variant={isMobile ? "body1" : "h6"}
      className={classes.title}
      title={String(t("boardTitleHint"))}
      onDoubleClick={start}
    >
      <b>{title}</b>
    </Typography>
  );
};

export default BoardTitle;
