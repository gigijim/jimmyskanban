import React from "react";
import { useFormik } from "formik";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Grid from "@material-ui/core/Grid";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import FormControl from "@material-ui/core/FormControl";
import FormLabel from "@material-ui/core/FormLabel";

import { Column } from "PersonalKanban/types";
import { ColumnColor } from "PersonalKanban/enums/index";
import ColorSwatches from "PersonalKanban/components/ColorSwatches";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";

type ColumnFormProps = {
  column?: Partial<Column>;
  onSubmit: any;
  onCancel: any;
  /** 有傳入時，在視窗左下角顯示「刪除欄位」 */
  onDelete?: any;
  disabled?: boolean;
  formTitle?: string;
};

const ColumnForm: React.FC<ColumnFormProps> = (props) => {
  const { t } = useTranslation();

  const {
    column,
    disabled,
    formTitle = t("addColumn"),
    onSubmit,
    onCancel,
    onDelete,
  } = props;

  const { values, errors, handleChange, handleSubmit, setFieldValue } = useFormik({
    initialValues: Object.assign(
      {
        title: "",
        description: "",
        color: "",
      },
      column
    ),
    onSubmit: (values) => {
      onSubmit && onSubmit(values);
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
            rows={3}
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
              palette={ColumnColor}
              value={values.color}
              disabled={disabled}
              onChange={(key) => setFieldValue("color", key)}
            />
          </FormControl>
        </Grid>
        <Grid item xs={12} style={{ display: "flex", alignItems: "center" }}>
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
          {onDelete && (
            <Button
              variant="outlined"
              disabled={disabled}
              onClick={onDelete}
              style={{ marginLeft: "auto", color: "#d32f2f", borderColor: "#d32f2f" }}
            >
              {t("deleteColumn")}
            </Button>
          )}
        </Grid>
      </Grid>
    </form>
  );
};

export default ColumnForm;
