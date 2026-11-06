import React from "react";
import Box from "@material-ui/core/Box";

import IconButton from "PersonalKanban/components/IconButton";
import { useTranslation } from "PersonalKanban/providers/TranslationProvider";

/** PWA 安裝按鈕：瀏覽器允許安裝時才出現（Edge / Chrome，不需要擴充套件） */
const InstallButton: React.FC<{}> = () => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const onPrompt = (e: any) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;

  return (
    <Box display="block">
      <IconButton
        icon="getApp"
        color="primary"
        title={t("install")}
        aria-label={t("install")}
        onClick={() => {
          prompt.prompt();
          prompt.userChoice.finally(() => setPrompt(null));
        }}
      />
    </Box>
  );
};

export default InstallButton;
