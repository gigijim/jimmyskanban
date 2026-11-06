import React from "react";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import LinearProgress from "@material-ui/core/LinearProgress";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";

import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import { Column } from "PersonalKanban/types";
import { formatTime } from "PersonalKanban/services/Utils";
import { makeBackup, NewerSchemaError, readBackup } from "PersonalKanban/services/Schema";
import { APP_VERSION } from "PersonalKanban/services/Version";
import {
  decryptFromText,
  encryptToText,
  peekText,
  SecureDecryptError,
  SecureFormatError,
} from "PersonalKanban/services/SecureText";

const FULL = "YYYY/MM/DD HH:mm:ss";

/** 複製到剪貼簿（不支援 Clipboard API 時改用選取 + execCommand） */
export async function copyText(text: string, fallbackEl?: HTMLTextAreaElement | null) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    /* 改用下面的方式 */
  }
  try {
    const el = fallbackEl || document.createElement("textarea");
    if (!fallbackEl) {
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
    }
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    if (!fallbackEl) document.body.removeChild(el);
    return ok;
  } catch (e) {
    return false;
  }
}

type Props = {
  mode: "export" | "import" | null;
  columns: Column[];
  onClose: () => void;
  /** 解密成功：交給備份選單走原本的「取代 / 合併」確認流程 */
  onImport: (incoming: Column[], mode: "replace" | "merge") => void;
  onExported?: () => void;
};

const MIN_PASSWORD = 4;

const SecureTextDialog: React.FC<Props> = ({ mode, columns, onClose, onImport, onExported }) => {
  const { t } = useTranslation();
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{ text: string; exportedAt: string; copied: boolean } | null>(null);
  const outRef = React.useRef<HTMLTextAreaElement | null>(null);

  // 每次開啟都清空（密碼不留在畫面上）
  React.useEffect(() => {
    setPassword("");
    setPassword2("");
    setText("");
    setError("");
    setResult(null);
    setBusy(false);
  }, [mode]);

  const peek = React.useMemo(() => (mode === "import" ? peekText(text) : null), [mode, text]);

  const handleExport = async () => {
    setError("");
    if (password.length < MIN_PASSWORD) return setError(t("securePasswordShort", { n: MIN_PASSWORD }));
    if (password !== password2) return setError(t("securePasswordMismatch"));
    setBusy(true);
    try {
      const out = await encryptToText(makeBackup(columns, APP_VERSION), password, { title: t("secureTitle") });
      const copied = await copyText(out.text);
      setResult({ ...out, copied });
      onExported && onExported();
    } catch (e: any) {
      setError(`${t("secureFailed")} ${e && e.message ? `(${e.message})` : ""}`);
    } finally {
      setBusy(false);
      setPassword("");
      setPassword2("");
    }
  };

  const handleCopyAgain = async () => {
    if (!result) return;
    const copied = await copyText(result.text, outRef.current);
    setResult({ ...result, copied });
  };

  const handleImport = async (how: "replace" | "merge") => {
    setError("");
    if (!peek) return setError(t("secureNotFound"));
    setBusy(true);
    try {
      const { data } = await decryptFromText(text, password);
      const incoming = readBackup(data).columns;
      onImport(incoming, how);
    } catch (e: any) {
      if (e instanceof SecureDecryptError) setError(t("secureWrongPassword"));
      else if (e instanceof SecureFormatError) setError(t("secureNotFound"));
      else if (e instanceof NewerSchemaError) setError(t("backupNewerSchema"));
      else setError(`${t("secureFailed")} ${e && e.message ? `(${e.message})` : ""}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(mode)} onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "export" ? t("secureExport") : t("secureImport")}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {t("secureHint")}
        </Typography>

        {mode === "export" && !result && (
          <>
            <TextField
              type="password"
              label={t("securePassword")}
              value={password}
              autoFocus
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              type="password"
              label={t("securePasswordConfirm")}
              value={password2}
              autoComplete="new-password"
              onChange={(e) => setPassword2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleExport()}
            />
            <Typography variant="caption" color="textSecondary" component="div">
              {t("securePasswordWarning")}
            </Typography>
          </>
        )}

        {mode === "export" && result && (
          <>
            <Typography gutterBottom>
              {t("secureTimestamp")}：<b>{formatTime(result.exportedAt, FULL)}</b>
            </Typography>
            <TextField
              multiline
              minRows={6}
              maxRows={14}
              value={result.text}
              inputRef={outRef}
              InputProps={{ readOnly: true, style: { fontFamily: "Consolas, monospace", fontSize: 12 } }}
              onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <Typography color={result.copied ? "primary" : "error"} variant="body2">
              {result.copied ? t("secureCopied", { n: result.text.length }) : t("secureCopyManually")}
            </Typography>
          </>
        )}

        {mode === "import" && (
          <>
            <TextField
              multiline
              minRows={6}
              maxRows={14}
              label={t("securePaste")}
              value={text}
              autoFocus
              InputProps={{ style: { fontFamily: "Consolas, monospace", fontSize: 12 } }}
              onChange={(e) => setText(e.target.value)}
            />
            <Box minHeight={24}>
              {text && (
                <Typography variant="body2" color={peek ? "primary" : "error"}>
                  {peek ? `${t("secureTimestamp")}：${formatTime(peek.exportedAt, FULL)}` : t("secureNotFound")}
                </Typography>
              )}
            </Box>
            <TextField
              type="password"
              label={t("securePassword")}
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        {busy && <LinearProgress />}
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" disabled={busy} onClick={onClose}>
          {t("close")}
        </Button>
        {mode === "export" && !result && (
          <Button variant="contained" color="primary" disabled={busy || !password} onClick={handleExport}>
            {t("secureEncryptCopy")}
          </Button>
        )}
        {mode === "export" && result && (
          <Button variant="contained" color="primary" onClick={handleCopyAgain}>
            {t("secureCopy")}
          </Button>
        )}
        {mode === "import" && (
          <>
            <Button variant="outlined" disabled={busy || !password || !peek} onClick={() => handleImport("merge")}>
              {t("importMerge")}
            </Button>
            <Button variant="contained" color="primary" disabled={busy || !password || !peek} onClick={() => handleImport("replace")}>
              {t("importReplace")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SecureTextDialog;
