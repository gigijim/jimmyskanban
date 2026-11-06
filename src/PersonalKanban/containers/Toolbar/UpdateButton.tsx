import React from "react";
import Badge from "@material-ui/core/Badge";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import LinearProgress from "@material-ui/core/LinearProgress";
import Link from "@material-ui/core/Link";
import Typography from "@material-ui/core/Typography";

import IconButton from "PersonalKanban/components/IconButton";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import { Column } from "PersonalKanban/types";
import StorageService from "PersonalKanban/services/StorageService";
import {
  applyUpdate,
  canSelfUpdate,
  checkForUpdate,
  CURRENT,
  IS_SINGLE_FILE,
  ReleaseInfo,
  RELEASE_URL,
} from "PersonalKanban/services/Version";
import { formatTime } from "PersonalKanban/services/Utils";

type Status = "idle" | "checking" | "upToDate" | "available" | "updating" | "offline" | "failed";

const label = (r?: ReleaseInfo | null) => (r ? `v${r.version}（${r.build}）` : "—");

/** 右上角「檢查更新」：只有使用者按下才會下載新版本 */
const UpdateButton: React.FC<{ columns: Column[] }> = ({ columns }) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<Status>("idle");
  const [latest, setLatest] = React.useState<ReleaseInfo | null>(null);
  const [error, setError] = React.useState("");

  const check = React.useCallback(async () => {
    setStatus("checking");
    setError("");
    try {
      const result = await checkForUpdate();
      setLatest(result.latest);
      setStatus(result.hasUpdate ? "available" : "upToDate");
    } catch (e: any) {
      // 檢查失敗（連不到伺服器 / 公司網路擋住）一律視為離線，不影響使用
      setStatus("offline");
      setLatest(null);
    }
  }, []);

  const handleOpen = () => {
    setOpen(true);
    check();
  };

  const handleUpdate = async () => {
    setStatus("updating");
    try {
      // 更新前：寫入資料庫並保存快照（新版若升級資料格式，也會再存一份）
      await StorageService.flush();
      await StorageService.addSnapshot(columns, "beforeUpdate");
      await applyUpdate();
      window.location.reload();
    } catch (e: any) {
      setStatus("failed");
      setError(String(e && e.message ? e.message : e));
    }
  };

  const selfUpdate = canSelfUpdate();

  return (
    <Box display="block">
      <IconButton
        icon="systemUpdate"
        color="primary"
        title={`${t("checkUpdate")}（${label(CURRENT)}）`}
        aria-label={t("checkUpdate")}
        onClick={handleOpen}
        iconProps={{ fontSize: "small" }}
      />
      <Dialog open={open} onClose={() => status !== "updating" && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t("checkUpdate")}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {t("currentVersion")}：<b>{label(CURRENT)}</b>
          </Typography>
          <Typography gutterBottom>
            {t("latestVersion")}：
            <Badge color="secondary" variant="dot" invisible={status !== "available"}>
              <b>{status === "checking" ? t("updateChecking") : label(latest)}</b>
            </Badge>
          </Typography>
          {latest?.builtAt && (
            <Typography variant="caption" color="textSecondary" component="div" gutterBottom>
              {formatTime(latest.builtAt, "YYYY/MM/DD HH:mm")}
            </Typography>
          )}
          {(status === "checking" || status === "updating") && <LinearProgress />}
          <Box marginTop={1}>
            {status === "upToDate" && <Typography color="primary">{t("upToDate")}</Typography>}
            {status === "available" && <Typography color="secondary">{t("updateAvailable")}</Typography>}
            {status === "updating" && <Typography>{t("updating")}</Typography>}
            {status === "offline" && <Typography color="error">{t("updateOffline")}</Typography>}
            {status === "failed" && (
              <Typography color="error">
                {t("updateFailed")} {error && `(${error})`}
              </Typography>
            )}
          </Box>
          <Box marginTop={2}>
            {IS_SINGLE_FILE || !selfUpdate ? (
              <Typography variant="body2" color="textSecondary">
                {t("updateSingleFileHint")}{" "}
                <Link href={`${RELEASE_URL}jimmyskanban-offline.html`} target="_blank" rel="noopener">
                  {t("downloadLatest")}
                </Link>
              </Typography>
            ) : (
              <Typography variant="body2" color="textSecondary">
                {t("updateHint")}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" disabled={status === "updating"} onClick={() => setOpen(false)}>
            {t("close")}
          </Button>
          <Button variant="outlined" disabled={status === "checking" || status === "updating"} onClick={check}>
            {t("checkAgain")}
          </Button>
          {selfUpdate && (
            <Button variant="contained" color="primary" disabled={status !== "available"} onClick={handleUpdate}>
              {t("updateNow")}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UpdateButton;
