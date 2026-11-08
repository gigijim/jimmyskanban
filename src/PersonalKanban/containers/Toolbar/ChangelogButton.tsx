import React from "react";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import Chip from "@material-ui/core/Chip";
import { makeStyles } from "@material-ui/core/styles";
import GitHubIcon from "@material-ui/icons/GitHub";

import IconButton from "PersonalKanban/components/IconButton";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import { CHANGELOG } from "PersonalKanban/constants/changelog";
import { APP_VERSION } from "PersonalKanban/services/Version";

export const REPO_URL = "https://github.com/gigijim/jimmyskanban";

const useStyles = makeStyles((theme) => ({
  entry: {
    paddingBottom: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&:last-child": { borderBottom: 0, marginBottom: 0 },
  },
  head: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  list: {
    margin: theme.spacing(0.5, 0, 0),
    paddingLeft: theme.spacing(2.5),
  },
}));

const ChangelogButton: React.FC<{}> = () => {
  const { t, i18n } = useTranslation();
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const zh = /^(tw|zh)/i.test(i18n.language || "");
  const current = APP_VERSION;

  return (
    <Box display="block">
      <IconButton
        color="inherit"
        icon="gitHub"
        title={t("changelog")}
        aria-label={t("changelog")}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>{t("changelog")}</DialogTitle>
        <DialogContent dividers>
          {CHANGELOG.map((e) => (
            <div key={e.version} className={classes.entry}>
              <div className={classes.head}>
                <Typography variant="subtitle1">
                  <b>v{e.version}</b>
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {e.date}
                </Typography>
                {e.version === current && <Chip size="small" color="primary" label={t("changelogCurrent")} />}
              </div>
              <ul className={classes.list}>
                {(zh ? e.tw : e.en).map((line) => (
                  <li key={line}>
                    <Typography variant="body2">{line}</Typography>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<GitHubIcon fontSize="small" />}
          >
            {t("changelogGitHub")}
          </Button>
          <Box flexGrow={1} />
          <Button variant="contained" color="primary" onClick={() => setOpen(false)}>
            {t("close")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChangelogButton;
