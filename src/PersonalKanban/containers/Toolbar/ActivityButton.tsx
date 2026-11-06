import React from "react";
import moment from "moment";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";

import IconButton from "PersonalKanban/components/IconButton";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import { useTheme } from "PersonalKanban/providers/ThemeProvider";
import { Column } from "PersonalKanban/types";
import StorageService from "PersonalKanban/services/StorageService";
import { buildDaily, buildWeeks, DAY, levelOf, summarize, yearsWithData } from "PersonalKanban/services/Activity";

// GitHub 的配色（淺色 / 深色）
const LIGHT = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const DARK = ["#2c2c2e", "#0e4429", "#006d32", "#26a641", "#39d353"];

const CELL = 12;
const GAP = 3;
const LEFT = 28;
const TOP = 18;

const useStyles = makeStyles((theme) => ({
  scroll: {
    overflowX: "auto",
    paddingBottom: 4,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
  stat: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    padding: theme.spacing(1, 1.5),
  },
  years: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: theme.spacing(1.5),
  },
  legend: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    marginTop: 4,
    color: theme.palette.text.secondary,
    fontSize: 11,
  },
  selected: {
    marginTop: theme.spacing(1),
    minHeight: 22,
  },
}));

type Range = "last" | string; // "last" = 最近一年；其他 = 年份

const ActivityButton: React.FC<{ columns: Column[] }> = ({ columns }) => {
  const { t } = useTranslation();
  const { darkTheme } = useTheme();
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<Range>("last");
  const [hover, setHover] = React.useState<{ day: string; count: number } | null>(null);

  const palette = darkTheme ? DARK : LIGHT;
  const weekdays: string[] = t("activityWeekdays").split(",");
  const months: string[] = t("activityMonths").split(",");

  const daily = React.useMemo(() => (open ? buildDaily(columns, StorageService.getActivity()) : {}), [open, columns]);
  const years = React.useMemo(() => yearsWithData(daily), [daily]);
  const today = moment().format(DAY);

  const end = range === "last" ? moment() : moment(`${range}-12-31`, DAY);
  const weeks = React.useMemo(() => buildWeeks(end, 53), [range, open]); // eslint-disable-line
  const from = range === "last" ? weeks[0][0].day : `${range}-01-01`;
  const to = range === "last" ? today : `${range}-12-31`;
  const inRange = (d: string) => d >= from && d <= to;

  const max = React.useMemo(() => {
    let m = 0;
    weeks.forEach((w) => w.forEach((c) => inRange(c.day) && (m = Math.max(m, daily[c.day] || 0))));
    return m;
  }, [weeks, daily, from, to]); // eslint-disable-line

  const stats = summarize(daily, from, to < today ? to : today, today);

  const width = LEFT + weeks.length * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);
  const fmtDay = (d: string) => {
    const m = moment(d, DAY);
    return `${m.format("YYYY/MM/DD")}（${weekdays[m.day()]}）`;
  };

  return (
    <Box display="block">
      <IconButton
        icon="activity"
        color="primary"
        title={t("activity")}
        aria-label={t("activity")}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t("activity")}</DialogTitle>
        <DialogContent>
          <div className={classes.years}>
            <Button size="small" variant={range === "last" ? "contained" : "outlined"} color="primary" onClick={() => setRange("last")}>
              {t("activityLastYear")}
            </Button>
            {years.map((y) => (
              <Button key={y} size="small" variant={range === y ? "contained" : "outlined"} color="primary" onClick={() => setRange(y)}>
                {y}
              </Button>
            ))}
          </div>

          <Typography gutterBottom>
            <b>{t("activityTotal", { n: stats.total, range: range === "last" ? t("activityLastYear") : range })}</b>
          </Typography>

          <div className={classes.scroll}>
            <svg width={width} height={height} role="img" aria-label={t("activity")} style={{ display: "block" }}>
              {/* 月份 */}
              {weeks.map((w, i) => {
                // 該週的週日換了月份就標月份；第一欄只有在月初兩週內才標，避免和下個月重疊
                const d = w[0].date;
                const show = i === 0 ? d.date() <= 14 : d.month() !== weeks[i - 1][0].date.month();
                if (!show) return null;
                return (
                  <text key={`m${i}`} x={LEFT + i * (CELL + GAP)} y={11} fontSize={10} fill="currentColor" opacity={0.7}>
                    {months[d.month()]}
                  </text>
                );
              })}
              {/* 星期（一、三、五） */}
              {[1, 3, 5].map((d) => (
                <text key={`d${d}`} x={0} y={TOP + d * (CELL + GAP) + CELL - 2} fontSize={10} fill="currentColor" opacity={0.7}>
                  {weekdays[d]}
                </text>
              ))}
              {weeks.map((w, i) =>
                w.map((c) => {
                  if (c.future || !inRange(c.day) || c.day > today) return null;
                  const n = daily[c.day] || 0;
                  return (
                    <rect
                      key={c.day}
                      x={LEFT + i * (CELL + GAP)}
                      y={TOP + c.date.day() * (CELL + GAP)}
                      width={CELL}
                      height={CELL}
                      rx={2}
                      fill={palette[levelOf(n, max)]}
                      stroke={c.day === today ? (darkTheme ? "#fff" : "#000") : "rgba(27,31,35,0.06)"}
                      strokeWidth={c.day === today ? 1.5 : 1}
                      onMouseEnter={() => setHover({ day: c.day, count: n })}
                      onMouseLeave={() => setHover(null)}
                    >
                      <title>{`${fmtDay(c.day)}：${t("activityCount", { n })}`}</title>
                    </rect>
                  );
                })
              )}
            </svg>
          </div>

          <div className={classes.legend}>
            {t("activityLess")}
            {palette.map((p) => (
              <span key={p} style={{ width: CELL, height: CELL, borderRadius: 2, background: p, display: "inline-block" }} />
            ))}
            {t("activityMore")}
          </div>

          <Typography variant="body2" className={classes.selected} color="textSecondary">
            {hover ? `${fmtDay(hover.day)}：${t("activityCount", { n: hover.count })}` : t("activityHint")}
          </Typography>

          <div className={classes.stats}>
            <div className={classes.stat}>
              <Typography variant="caption" color="textSecondary">{t("activityActiveDays")}</Typography>
              <Typography variant="h6">{stats.activeDays}</Typography>
            </div>
            <div className={classes.stat}>
              <Typography variant="caption" color="textSecondary">{t("activityLongest")}</Typography>
              <Typography variant="h6">{t("activityDays", { n: stats.longest })}</Typography>
            </div>
            <div className={classes.stat}>
              <Typography variant="caption" color="textSecondary">{t("activityCurrent")}</Typography>
              <Typography variant="h6">{t("activityDays", { n: stats.current })}</Typography>
            </div>
            <div className={classes.stat}>
              <Typography variant="caption" color="textSecondary">{t("activityBusiest")}</Typography>
              <Typography variant="h6">
                {stats.busiest.count ? `${moment(stats.busiest.day, DAY).format("MM/DD")} · ${stats.busiest.count}` : "—"}
              </Typography>
            </div>
          </div>
          <Typography variant="caption" color="textSecondary" component="p" style={{ marginTop: 12 }}>
            {t("activitySource")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="primary" onClick={() => setOpen(false)}>
            {t("close")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActivityButton;
