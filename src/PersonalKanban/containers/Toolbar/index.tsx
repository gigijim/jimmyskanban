import React from "react";

import AppBar from "@material-ui/core/AppBar";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import Divider from "@material-ui/core/Divider";
import MuiToolbar from "@material-ui/core/Toolbar";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { makeStyles, useTheme as useMuiTheme } from "@material-ui/core/styles";

import { useTranslation } from "PersonalKanban/providers/TranslationProvider";
import ColumnForm from "PersonalKanban/components/ColumnForm";
import IconButton from "PersonalKanban/components/IconButton";
import { Column } from "PersonalKanban/types";
import { useTheme } from "PersonalKanban/providers/ThemeProvider";
import BackupButton from "./BackupButton";
import InstallButton from "./InstallButton";
import UpdateButton from "./UpdateButton";
import SearchBox from "./SearchBox";
import ActivityButton from "./ActivityButton";
import ChangelogButton from "./ChangelogButton";
import BoardTitle from "./BoardTitle";

type AddColumnButtonProps = {
  onSubmit: any;
};

const AddColumnButton: React.FC<AddColumnButtonProps> = (props) => {
  const { onSubmit } = props;

  const { t } = useTranslation();

  const [open, setOpen] = React.useState(false);

  const handleOpenDialog = React.useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseDialog = React.useCallback(() => {
    setOpen(false);
  }, []);

  const handleSubmit = React.useCallback(
    (column: Column) => {
      onSubmit({ column });
      handleCloseDialog();
    },
    [onSubmit, handleCloseDialog]
  );

  return (
    <Box display="block">
      <IconButton icon="add" color="primary" onClick={handleOpenDialog}>
        {t("addColumn")}
      </IconButton>
      <Dialog onClose={handleCloseDialog} open={open}>
        <DialogContent>
          <ColumnForm onSubmit={handleSubmit} onCancel={handleCloseDialog} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

type ClearBoardButtonProps = {
  onClear: any;
  disabled?: boolean;
};

const ClearBoardButton: React.FC<ClearBoardButtonProps> = (props) => {
  const { disabled, onClear } = props;

  const { t } = useTranslation();

  const [open, setOpen] = React.useState(false);

  const handleOpenDialog = React.useCallback(() => {
    setOpen(true);
  }, []);

  const handleCloseDialog = React.useCallback(() => {
    setOpen(false);
  }, []);

  const handleClear = React.useCallback(
    (e) => {
      onClear({ e });
      handleCloseDialog();
    },
    [onClear, handleCloseDialog]
  );

  return (
    <Box display="flex">
      <IconButton
        icon="delete"
        color="primary"
        disabled={disabled}
        onClick={handleOpenDialog}
      ></IconButton>
      <Dialog onClose={handleCloseDialog} open={open}>
        <DialogContent>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography gutterBottom variant="h6">
                {t("clearBoard")}
              </Typography>
              <Divider />
            </Grid>
            <Grid item xs={12}>
              <Typography gutterBottom>
                {t("clearBoardConfirmation")}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" onClick={handleCloseDialog}>
                {t("cancel")}
              </Button>
              &nbsp;
              <Button color="primary" variant="contained" onClick={handleClear}>
                {t("clear")}
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

type LanguageButtonProps = {};

const LanguageButton: React.FC<LanguageButtonProps> = (props) => {
  const { i18n } = useTranslation();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChangeLanguage = (lng: string) => () => {
    i18n.changeLanguage(lng);
    handleClose();
  };

  return (
    <Box display="block">
      <IconButton
        icon={"language"}
        aria-controls="language-menu"
        aria-haspopup="true"
        color="inherit"
        onClick={handleClick}
      />
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleChangeLanguage("zh-TW")}>繁體中文</MenuItem>
        <MenuItem onClick={handleChangeLanguage("en")}>English</MenuItem>
        <MenuItem onClick={handleChangeLanguage("jp")}>日本語</MenuItem>
      </Menu>
    </Box>
  );
};

/** 切換淺色 / 深色模式（淺色時顯示月亮，深色時顯示太陽） */
const DarkThemeButton: React.FC<{}> = () => {
  const { darkTheme, handleToggleDarkTheme } = useTheme();
  const { t } = useTranslation();
  const label = darkTheme ? t("switchToLight") : t("switchToDark");

  return (
    <IconButton
      color="inherit"
      icon={darkTheme ? "lightMode" : "darkMode"}
      title={label}
      aria-label={label}
      onClick={handleToggleDarkTheme}
    />
  );
};

const useToolbarStyles = makeStyles(() => ({
  paper: {
    padding: 0,
  },
}));

type ToolbarProps = {
  columns: Column[];
  searchQuery?: string;
  searchResultCount?: number;
  onSearchChange?: (value: string) => void;
  onReplaceBoard: (columns: Column[]) => void;
  clearButtonDisabled?: boolean;
  onNewColumn: any;
  onClearBoard: any;
};

const Toolbar: React.FC<ToolbarProps> = (props) => {
  const {
    columns,
    onReplaceBoard,
    clearButtonDisabled,
    onNewColumn,
    onClearBoard,
    searchQuery = "",
    searchResultCount = 0,
    onSearchChange,
  } = props;

  const { t } = useTranslation();

  const classes = useToolbarStyles();

  const muiTheme = useMuiTheme();

  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  return (
    <AppBar color="default" elevation={6} className={classes.paper}>
      <MuiToolbar>
        <Box display="flex" alignItems="center">
          <IconButton
            icon="personalKanban"
            color="primary"
            size="small"
            iconProps={{ fontSize: "large" }}
            disableRipple
            disableTouchRipple
            disableFocusRipple
          />
          &nbsp;
          <BoardTitle isMobile={isMobile} />
          {onSearchChange && (
            <SearchBox value={searchQuery} resultCount={searchResultCount} onChange={onSearchChange} />
          )}
        </Box>
        <Box display="flex" flexGrow={1} />
        <Box display="flex">
          <AddColumnButton onSubmit={onNewColumn} />
          &nbsp;
          <ActivityButton columns={columns} />
          &nbsp;
          <BackupButton columns={columns} onReplaceBoard={onReplaceBoard} />
          &nbsp;
          <InstallButton />
          &nbsp;
          <UpdateButton columns={columns} />
          &nbsp;
          <ClearBoardButton
            disabled={clearButtonDisabled}
            onClear={onClearBoard}
          />
          &nbsp;
          <DarkThemeButton /> &nbsp;
          <LanguageButton /> &nbsp;
          <ChangelogButton />
        </Box>
      </MuiToolbar>
    </AppBar>
  );
};

export default Toolbar;
