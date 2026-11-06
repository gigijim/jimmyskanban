import React from "react";
import CssBaseline from "@material-ui/core/CssBaseline";
import {
  MuiThemeProvider,
  createTheme,
  Theme,
} from "@material-ui/core/styles";
import {
  purple,
  indigo,
  blue,
  green,
  yellow,
  orange,
  red,
  brown,
  blueGrey,
  lightGreen,
} from "@material-ui/core/colors";

import StorageService from "PersonalKanban/services/StorageService";

declare module "@material-ui/core/styles/createTheme" {
  interface Theme {
    custom?: any;
  }
  interface ThemeOptions {
    custom?: any;
  }
}

const ThemeContext = React.createContext({});

type ThemeProviderProps = {
  darkTheme?: boolean;
};

const pastelCode = 200;

/** 深色模式色票（Apple 系統色，深色版） */
export const DARK = {
  base: "#000000",
  surface1: "#1C1C1E",
  surface2: "#2C2C2E",
  surface3: "#3A3A3C",
  blue: "#0A84FF",
  indigo: "#5E5CE6",
  red: "#FF453A",
  green: "#30D158",
};

const ThemeProvider: React.FC<ThemeProviderProps> = (props) => {
  const { children } = props;

  const [darkTheme, setDarkTheme] = React.useState(
    props.darkTheme || StorageService.getDarkMode()
  );

  const handleToggleDarkTheme = React.useCallback(() => {
    setDarkTheme((darkTheme: Boolean | undefined) => {
      StorageService.setDarkMode(!darkTheme);
      return !darkTheme;
    });
  }, []);

  /*
   * 深色模式：參考 Apple Human Interface / Microsoft Fluent 的 Dark Mode
   * - 純黑背景、分層的深灰表面（#1C1C1E → #2C2C2E → #3A3A3C）
   * - 純白主要文字、70% 次要文字，對比度 > 7:1
   * - 強調色用系統藍 #0A84FF，紅 / 綠用深色模式專用的高亮度版本
   */
  const theme: Theme = createTheme({
    palette: darkTheme
      ? {
          type: "dark",
          primary: { main: DARK.blue, contrastText: "#FFFFFF" },
          secondary: { main: DARK.indigo, contrastText: "#FFFFFF" },
          error: { main: DARK.red },
          success: { main: DARK.green },
          background: { default: DARK.base, paper: DARK.surface1 },
          text: {
            primary: "#FFFFFF",
            secondary: "rgba(235,235,245,0.72)",
            disabled: "rgba(235,235,245,0.36)",
          },
          divider: "rgba(84,84,88,0.65)",
          action: {
            hover: "rgba(255,255,255,0.08)",
            selected: "rgba(255,255,255,0.14)",
            disabled: "rgba(235,235,245,0.3)",
            disabledBackground: "rgba(235,235,245,0.12)",
          },
        }
      : {
          primary: brown,
          secondary: blueGrey,
          type: "light",
        },
    overrides: {
      MuiPaper: {
        root: {
          cursor: "pointer",
          padding: 8,
        },
      },
      MuiDivider: {
        root: {
          backgroundColor: darkTheme ? "rgba(84,84,88,0.65)" : "rgba(255,255,255,0.5)",
        },
      },
      ...(darkTheme
        ? {
            MuiCssBaseline: {
              "@global": {
                body: { backgroundColor: DARK.base, colorScheme: "dark" },
                "*::-webkit-scrollbar": { width: 10, height: 10 },
                "*::-webkit-scrollbar-thumb": { backgroundColor: DARK.surface3, borderRadius: 5 },
                "*::-webkit-scrollbar-track": { backgroundColor: DARK.base },
              },
            },
            MuiAppBar: {
              colorDefault: {
                backgroundColor: "rgba(28,28,30,0.92)",
                backdropFilter: "saturate(180%) blur(20px)",
                color: "#FFFFFF",
                borderBottom: "1px solid rgba(84,84,88,0.65)",
                boxShadow: "none",
              },
            },
            MuiDialog: {
              paper: { backgroundColor: DARK.surface2, border: "1px solid rgba(84,84,88,0.65)" },
            },
            MuiMenu: {
              paper: { backgroundColor: DARK.surface2, border: "1px solid rgba(84,84,88,0.65)" },
            },
            MuiTooltip: {
              tooltip: { backgroundColor: DARK.surface3, color: "#FFFFFF", fontSize: 12 },
            },
            MuiOutlinedInput: {
              notchedOutline: { borderColor: "rgba(235,235,245,0.3)" },
            },
          }
        : {}),
    },
    typography: {
      // 原版 14px；稍微縮小讓同一畫面放得下更多欄位
      fontSize: 13,
      fontFamily: "'Nunito', 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif",
      fontWeightLight: 300,
      fontWeightMedium: 400,
      fontWeightRegular: 400,
      fontWeightBold: 700,
    },
    props: {
      // 關閉視窗 / 選單後不要把焦點還給開啟前的元素：
      // 那個元素常是「已完成」區的卡片（卡片可被拖曳、會取得焦點），
      // 瀏覽器為了讓它可見會自動捲動，畫面就跳到已完成區
      MuiDialog: { disableRestoreFocus: true },
      MuiMenu: { disableRestoreFocus: true },
      MuiPopover: { disableRestoreFocus: true },
      MuiDivider: {
        light: darkTheme ? false : true,
      },
      MuiTextField: {
        variant: "outlined",
        margin: "dense",
        fullWidth: true,
      },
      MuiButton: {
        size: "small",
      },
      MuiRadio: {
        size: "small",
      },
    },
    custom: {
      colors: {
        pastel: {
          violet: purple[pastelCode],
          indigo: indigo[pastelCode],
          blue: blue[pastelCode],
          green: green[pastelCode],
          yellow: yellow[pastelCode],
          orange: orange[pastelCode],
          red: red[pastelCode],
        },
      },
    },
  });

  const value = React.useMemo(
    () => ({
      darkTheme,
      handleToggleDarkTheme,
    }),
    [darkTheme, handleToggleDarkTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): any => React.useContext(ThemeContext);

export default ThemeProvider;
