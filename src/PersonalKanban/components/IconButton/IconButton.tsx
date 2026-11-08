import React from "react";
import MuiIconButton, {
  IconButtonProps as MuiIconButtonProps,
} from "@material-ui/core/IconButton";

import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import AddIcon from "@material-ui/icons/Add";
import AddCircleIcon from "@material-ui/icons/AddCircle";
import ActivityIcon from "@material-ui/icons/GridOn";
import DarkModeIcon from "@material-ui/icons/Brightness4";
import LightModeIcon from "@material-ui/icons/Brightness7";
import DeleteForeverIcon from "@material-ui/icons/DeleteForever";
import DeleteSweepIcon from "@material-ui/icons/DeleteSweep";
import InvertColorsIcon from "@material-ui/icons/InvertColors";
import InvertColorsOffIcon from "@material-ui/icons/InvertColorsOff";
import LanguageIcon from "@material-ui/icons/Translate";
import GitHubIcon from "@material-ui/icons/GitHub";
import DeveloperBoardIcon from "@material-ui/icons/DeveloperBoard";
import InfoIcon from "@material-ui/icons/Info";
import ListIcon from "@material-ui/icons/List";
import Tooltip from "@material-ui/core/Tooltip";
import BackupIcon from "./DataTransferIcon"; // 備份 / 匯入 / 匯出：資料庫 ⇄ 文件
import GetAppIcon from "@material-ui/icons/GetApp";
import SystemUpdateIcon from "@material-ui/icons/Autorenew"; // 檢查更新：循環箭頭

const icons = {
  edit: EditIcon,
  delete: DeleteIcon,
  add: AddIcon,
  addCircle: AddCircleIcon,
  activity: ActivityIcon,
  darkMode: DarkModeIcon,
  lightMode: LightModeIcon,
  deleteSweep: DeleteSweepIcon,
  deleteForever: DeleteForeverIcon,
  invertColors: InvertColorsIcon,
  invertColorsOff: InvertColorsOffIcon,
  gitHub: GitHubIcon,
  language: LanguageIcon,
  personalKanban: DeveloperBoardIcon,
  info: InfoIcon,
  list: ListIcon,
  backup: BackupIcon,
  getApp: GetAppIcon,
  systemUpdate: SystemUpdateIcon,
};

type IconButtonProps = MuiIconButtonProps & {
  icon: keyof typeof icons;
  iconProps?: any;
  component?: any;
  href?: string;
  target?: string;
};

const IconButton: React.FC<IconButtonProps> = (props) => {
  const { icon, iconProps = {}, ...rest } = props;
  const Icon = icons[icon];
  if (!Icon) return null;
  const { title, ...buttonProps } = rest;
  const button = (
    <MuiIconButton size="small" aria-label={typeof title === "string" ? title : undefined} {...buttonProps}>
      <Icon fontSize="small" {...iconProps} />
    </MuiIconButton>
  );
  if (!title) return button;
  // 滑鼠移過去顯示說明；停用的按鈕不會觸發事件，外面包一層 span
  return (
    <Tooltip title={title} arrow enterDelay={300}>
      {buttonProps.disabled ? <span style={{ display: "inline-flex" }}>{button}</span> : button}
    </Tooltip>
  );
};

export default IconButton;
