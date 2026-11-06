import React from "react";
import { useFormik } from "formik";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Grid from "@material-ui/core/Grid";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import FormLabel from "@material-ui/core/FormLabel";
import FormControl from "@material-ui/core/FormControl";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { formatTime, parseTime } from "PersonalKanban/services/Utils";

// <input type="datetime-local"> 使用的本地時間格式
const LOCAL = "YYYY-MM-DDTHH:mm";
const TIME_FIELDS = ["createdAt", "updatedAt", "completedAt"] as const;
type TimeField = typeof TIME_FIELDS[number];

import { Record } from "PersonalKanban/types";
import { RecordColor } from "PersonalKanban/enums";
import Radio from "PersonalKanban/components/Radio";
import ColorSwatches from "PersonalKanban/components/ColorSwatches";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";

type RecordFormProps = {
  record?: Record;
  onSubmit: any;
  onCancel?: any;
  disabled?: boolean;
  formTitle?: string;
};

const RecordForm: React.FC<RecordFormProps> = (props) => {
  const { t } = useTranslation();

  const {
    record,
    disabled,
    formTitle = t("addRecord"),
    onSubmit,
    onCancel,
  } = props;

  // 三個時間的初始值（換成本地時間字串，給時間輸入框用）
  const initialTimes = React.useMemo(() => {
    const out: { [k in TimeField]: string } = { createdAt: "", updatedAt: "", completedAt: "" };
    TIME_FIELDS.forEach((k) => (out[k] = formatTime(record && (record as any)[k], LOCAL)));
    return out;
  }, [record]);

  const { values, errors, handleChange, handleSubmit, setFieldValue } = useFormik({
    initialValues: Object.assign(
      {
        title: "",
        description: "",
        color: "",
        stamp: "",
      },
      record,
      { times: initialTimes }
    ),
    onSubmit: (values: any) => {
      const { times, ...rest } = values;
      // 只有手動改過的時間才送出新值，其他保留原本（含秒數）
      TIME_FIELDS.forEach((k) => {
        if (times[k] !== initialTimes[k]) {
          const m = parseTime(times[k]);
          if (m) rest[k] = m.toISOString();
        }
      });
      onSubmit && onSubmit(rest);
    },
    validate: (values) => {
      const errors: any = {};
      if (!values.title) {
        errors.title = t("titleRequired");
      }

      return errors;
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Typography gutterBottom variant="h6">
            {formTitle}
          </Typography>
          <Divider />
        </Grid>
        <Grid item xs={12}>
          <TextField
            name="title"
            label={t("title")}
            value={values.title}
            error={Boolean(errors.title)}
            helperText={errors.title}
            disabled={disabled}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            multiline
            minRows={12}
            maxRows={24}
            name="description"
            label={t("description")}
            value={values.description}
            error={Boolean(errors.description)}
            helperText={errors.description}
            disabled={disabled}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">{t("background")}</FormLabel>
            <ColorSwatches
              palette={RecordColor}
              value={values.color}
              disabled={disabled}
              onChange={(key) => setFieldValue("color", key)}
            />
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormLabel component="legend">{t("stamp")}</FormLabel>
            <RadioGroup
              row
              aria-label="stamp"
              name="stamp"
              value={values.stamp || ""}
              onChange={handleChange}
            >
              <FormControlLabel value="" control={<Radio />} label={t("stampNone")} />
              <FormControlLabel
                value="important"
                control={<Radio color="#d32f2f" />}
                label={<b style={{ color: "#d32f2f" }}>{t("stampImportant")}</b>}
              />
              <FormControlLabel
                value="done"
                control={<Radio color="#2e7d32" />}
                label={<b style={{ color: "#2e7d32" }}>{t("stampDone")}</b>}
              />
            </RadioGroup>
          </FormControl>
        </Grid>
        {record &&
          TIME_FIELDS.map((k) => (
            <Grid item xs={12} sm={4} key={k}>
              {/* 點一下即可修改時間；「完成時間」只有蓋上完成印章時可改 */}
              <TextField
                type="datetime-local"
                name={`times.${k}`}
                label={t(k)}
                value={values.times[k]}
                disabled={disabled || (k === "completedAt" && values.stamp !== "done")}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 60 }}
              />
            </Grid>
          ))}
        <Grid item xs={12}>
          <Button variant="outlined" disabled={disabled} onClick={onCancel}>
            {t("cancel")}
          </Button>
          &nbsp;
          <Button
            type="submit"
            color="primary"
            variant="contained"
            disabled={disabled}
          >
            {t("submit")}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default RecordForm;
