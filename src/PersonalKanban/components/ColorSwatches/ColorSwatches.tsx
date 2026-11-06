import React from "react";
import CheckIcon from "@material-ui/icons/Check";
import { makeStyles } from "@material-ui/core/styles";

import { ColorName } from "PersonalKanban/enums";

const useStyles = makeStyles((theme) => ({
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 6,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    padding: 0,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)",
    transition: "transform .1s",
    "&:hover": { transform: "scale(1.12)" },
    "&:focus-visible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
  },
  selected: {
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${theme.palette.text.primary}`,
  },
  // 「預設」：白底加一條斜線
  none: {
    background: `linear-gradient(135deg, transparent 45%, ${theme.palette.error.main} 45%, ${theme.palette.error.main} 55%, transparent 55%), ${theme.palette.background.paper}`,
  },
  check: {
    fontSize: 16,
    color: "rgba(0,0,0,.7)",
  },
}));

type ColorSwatchesProps = {
  palette: { [key: string]: string };
  value?: string;
  onChange: (key: string) => void;
  disabled?: boolean;
};

/** 顏色選擇：一排小圓色票（依色相環排列），取代原本的單選按鈕 */
const ColorSwatches: React.FC<ColorSwatchesProps> = ({ palette, value = "", onChange, disabled }) => {
  const classes = useStyles();
  const current = value || "Default";
  return (
    <div className={classes.grid} role="radiogroup">
      {Object.keys(palette).map((key) => {
        const selected = current === key;
        const name = (ColorName as any)[key] || key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            title={name}
            disabled={disabled}
            className={`${classes.swatch} ${key === "Default" ? classes.none : ""} ${selected ? classes.selected : ""}`}
            style={key === "Default" ? undefined : { backgroundColor: palette[key] }}
            onClick={() => onChange(key === "Default" ? "" : key)}
          >
            {selected && key !== "Default" && <CheckIcon className={classes.check} />}
          </button>
        );
      })}
    </div>
  );
};

export default ColorSwatches;
