import React from "react";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Divider from "@material-ui/core/Divider";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Snackbar from "@material-ui/core/Snackbar";
import Typography from "@material-ui/core/Typography";

import IconButton from "PersonalKanban/components/IconButton";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import { Column, Stamp } from "PersonalKanban/types";
import StorageService, { Snapshot } from "PersonalKanban/services/StorageService";
import { fileStamp, pickJSON, saveFile } from "PersonalKanban/services/FileService";
import { formatTime, mergeColumns, normalizeColumns, toCSV } from "PersonalKanban/services/Utils";

type BackupButtonProps = {
  columns: Column[];
  onReplaceBoard: (columns: Column[]) => void;
};

type Confirm = { title: string; text: string; onOk: () => void } | null;

const countRecords = (columns: Column[]) =>
  columns.reduce((n, c) => n + (c.records || []).length, 0);

const BackupButton: React.FC<BackupButtonProps> = (props) => {
  const { columns, onReplaceBoard } = props;
  const { t } = useTranslation();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [message, setMessage] = React.useState("");
  const [confirm, setConfirm] = React.useState<Confirm>(null);
  const [snapshots, setSnapshots] = React.useState<Snapshot[] | null>(null);
  const [lastBackup, setLastBackup] = React.useState(StorageService.getLastBackup());

  const close = () => setAnchorEl(null);

  const handleExportJson = async () => {
    close();
    const payload = { app: "JimmysKanban", version: 2, exportedAt: new Date().toISOString(), columns };
    const ok = await saveFile(
      JSON.stringify(payload, null, 2),
      `jimmyskanban-backup-${fileStamp()}.json`,
      "application/json",
      ".json"
    );
    if (ok) {
      const now = new Date().toISOString();
      StorageService.setLastBackup(now);
      setLastBackup(now);
      setMessage(t("backupDone"));
    }
  };

  const handleExportCsv = async () => {
    close();
    const stampLabel = (s: Stamp) => (s === "done" ? t("stampDone") : s === "important" ? t("stampImportant") : "");
    const csv = toCSV(columns, t("csvHeaders").split(","), stampLabel, (done) => (done ? t("completed") : t("inProgress")));
    await saveFile(csv, `jimmyskanban-${fileStamp()}.csv`, "text/csv", ".csv");
  };

  const handleImport = async (mode: "replace" | "merge") => {
    close();
    let next: Column[];
    try {
      const data = await pickJSON();
      if (!data) return;
      const incoming = normalizeColumns(data);
      next = mode === "merge" ? mergeColumns(columns, incoming) : incoming;
      const vars = { columns: incoming.length, records: countRecords(incoming) };
      setConfirm({
        title: mode === "merge" ? t("importMerge") : t("importReplace"),
        text: mode === "merge" ? t("importConfirmMerge", vars) : t("importConfirmReplace", vars),
        onOk: async () => {
          await StorageService.addSnapshot(columns, "beforeImport");
          onReplaceBoard(next);
          setMessage(t("importDone"));
        },
      });
    } catch (e) {
      setMessage(t("importFailed"));
    }
  };

  const openSnapshots = async () => {
    close();
    setSnapshots(await StorageService.listSnapshots());
  };

  const handleSnapshotNow = async () => {
    await StorageService.addSnapshot(columns, "manual");
    setSnapshots(await StorageService.listSnapshots());
  };

  const handleRestore = (snap: Snapshot) => {
    setSnapshots(null);
    setConfirm({
      title: t("restore"),
      text: t("restoreConfirm", { time: formatTime(snap.at, "YYYY/MM/DD HH:mm:ss") }),
      onOk: async () => {
        await StorageService.addSnapshot(columns, "beforeRestore");
        onReplaceBoard(normalizeColumns(snap.columns));
        setMessage(t("restored"));
      },
    });
  };

  const handleExportSnapshot = (snap: Snapshot) => {
    const payload = { app: "JimmysKanban", version: 2, exportedAt: snap.at, columns: snap.columns };
    saveFile(JSON.stringify(payload, null, 2), `jimmyskanban-snapshot-${snap.id}.json`, "application/json", ".json");
  };

  return (
    <Box display="block">
      <IconButton
        icon="backup"
        color="primary"
        title={`${t("backup")} · ${lastBackup ? t("lastBackup", { time: formatTime(lastBackup, "YYYY/MM/DD HH:mm") }) : t("neverBackedUp")}`}
        aria-controls="backup-menu"
        aria-haspopup="true"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget)}
      />
      <Menu id="backup-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={close}>
        <MenuItem onClick={handleExportJson}>{t("exportJson")}</MenuItem>
        <MenuItem onClick={handleExportCsv}>{t("exportCsv")}</MenuItem>
        <Divider />
        <MenuItem onClick={() => handleImport("replace")}>{t("importReplace")}</MenuItem>
        <MenuItem onClick={() => handleImport("merge")}>{t("importMerge")}</MenuItem>
        <Divider />
        <MenuItem onClick={openSnapshots}>{t("snapshots")}</MenuItem>
        <Divider />
        <MenuItem disabled>
          <Typography variant="caption">
            {lastBackup ? t("lastBackup", { time: formatTime(lastBackup, "YYYY/MM/DD HH:mm") }) : t("neverBackedUp")}
          </Typography>
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)}>
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirm?.text}</Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setConfirm(null)}>
            {t("cancel")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              const c = confirm;
              setConfirm(null);
              c && c.onOk();
            }}
          >
            {t("submit")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(snapshots)} onClose={() => setSnapshots(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t("snapshots")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {t("snapshotHint")}
          </Typography>
          {snapshots && snapshots.length === 0 && <Typography>{t("noSnapshot")}</Typography>}
          <List dense>
            {(snapshots || []).map((s) => (
              <ListItem key={s.id} divider>
                <ListItemText
                  primary={`${formatTime(s.at, "YYYY/MM/DD HH:mm:ss")}（${t(`snapshotReason_${s.reason}`)}）`}
                  secondary={`${s.columns.length} / ${countRecords(s.columns)}`}
                />
                <ListItemSecondaryAction>
                  <Button size="small" onClick={() => handleExportSnapshot(s)}>
                    {t("export")}
                  </Button>
                  <Button size="small" color="primary" onClick={() => handleRestore(s)}>
                    {t("restore")}
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleSnapshotNow}>
            {t("createSnapshot")}
          </Button>
          <Button variant="contained" color="primary" onClick={() => setSnapshots(null)}>
            {t("close")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={3000}
        onClose={() => setMessage("")}
        message={message}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
};

export default BackupButton;
