import React from "react";
import InputBase from "@material-ui/core/InputBase";
import MuiIconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import SearchIcon from "@material-ui/icons/Search";
import ClearIcon from "@material-ui/icons/Clear";
import { makeStyles, fade } from "@material-ui/core/styles";

import { useTranslation } from "PersonalKanban/providers/TranslationProvider";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
    marginLeft: theme.spacing(2),
    padding: "0 4px 0 8px",
    height: 36,
    width: 300,
    maxWidth: "40vw",
    borderRadius: 18,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: fade(theme.palette.text.primary, 0.05),
    transition: "background-color .15s, border-color .15s",
    "&:focus-within": {
      backgroundColor: theme.palette.background.paper,
      borderColor: theme.palette.primary.main,
    },
  },
  active: {
    borderColor: theme.palette.primary.main,
  },
  icon: {
    color: theme.palette.text.secondary,
    fontSize: 20,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    marginLeft: 6,
    fontSize: "0.9rem",
    minWidth: 0,
  },
  count: {
    flexShrink: 0,
    marginRight: 2,
    whiteSpace: "nowrap",
    color: theme.palette.text.secondary,
  },
  clear: {
    padding: 4,
  },
}));

type SearchBoxProps = {
  value: string;
  resultCount: number;
  onChange: (value: string) => void;
};

/** 標題旁的搜尋欄：輸入即篩選，清空即恢復全部；Esc 清除 */
const SearchBox: React.FC<SearchBoxProps> = ({ value, resultCount, onChange }) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const active = Boolean(value.trim());

  return (
    <div className={`${classes.root} ${active ? classes.active : ""}`} role="search">
      <SearchIcon className={classes.icon} onClick={() => inputRef.current && inputRef.current.focus()} />
      <InputBase
        inputRef={inputRef}
        className={classes.input}
        placeholder={t("searchPlaceholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onChange("");
        }}
        inputProps={{ "aria-label": t("searchPlaceholder") }}
      />
      {active && (
        <>
          <Typography variant="caption" className={classes.count}>
            {t("searchResult", { n: resultCount })}
          </Typography>
          <MuiIconButton size="small" className={classes.clear} title={t("clearSearch")} aria-label={t("clearSearch")} onClick={() => onChange("")}>
            <ClearIcon fontSize="small" />
          </MuiIconButton>
        </>
      )}
    </div>
  );
};

export default SearchBox;
