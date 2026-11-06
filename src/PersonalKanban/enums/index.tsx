import purple from "@material-ui/core/colors/purple";
import indigo from "@material-ui/core/colors/indigo";
import blue from "@material-ui/core/colors/blue";
import green from "@material-ui/core/colors/green";
import yellow from "@material-ui/core/colors/yellow";
import orange from "@material-ui/core/colors/orange";
import red from "@material-ui/core/colors/red";

const RECORD_SHADE = 200;

export const RecordColor = {
  Purple: purple[RECORD_SHADE],
  Indigo: indigo[RECORD_SHADE],
  Blue: blue[RECORD_SHADE],
  Green: green[RECORD_SHADE],
  Yellow: yellow[RECORD_SHADE],
  Orange: orange[RECORD_SHADE],
  Red: red[RECORD_SHADE],
  Default: "",
};

export const DARK_RECORD_SHADE = 500;

export const DarkRecordColor = {
  Purple: purple[DARK_RECORD_SHADE],
  Indigo: indigo[DARK_RECORD_SHADE],
  Blue: blue[DARK_RECORD_SHADE],
  Green: green[DARK_RECORD_SHADE],
  Yellow: yellow[700],
  Orange: orange[DARK_RECORD_SHADE],
  Red: red[DARK_RECORD_SHADE],
  Default: "",
};

const COLUMN_SHADE = 100;

export const ColumnColor = {
  Purple: purple[COLUMN_SHADE],
  Indigo: indigo[COLUMN_SHADE],
  Blue: blue[COLUMN_SHADE],
  Green: green[COLUMN_SHADE],
  Yellow: yellow[COLUMN_SHADE],
  Orange: orange[COLUMN_SHADE],
  Red: red[COLUMN_SHADE],
  Default: "",
};

export const DARK_COLUMN_SHADE = 400;

export const DarkColumnColor = {
  Purple: purple[DARK_COLUMN_SHADE],
  Indigo: indigo[DARK_COLUMN_SHADE],
  Blue: blue[DARK_COLUMN_SHADE],
  Green: green[DARK_COLUMN_SHADE],
  Yellow: yellow[700],
  Orange: orange[DARK_COLUMN_SHADE],
  Red: red[DARK_COLUMN_SHADE],
  Default: "",
};

/**
 * 已完成便條紙：整張蓋一層灰，左側保留一條原本顏色（較飽和的色階）的色帶，
 * 讓一眼分得出「已完成 / 進行中」，又看得出原本標記的顏色。
 */
export const DoneAccentColor = {
  Purple: purple[400],
  Indigo: indigo[400],
  Blue: blue[400],
  Green: green[500],
  Yellow: yellow[700],
  Orange: orange[500],
  Red: red[400],
  Default: "#9e9e9e",
};

export const DarkDoneAccentColor = {
  Purple: purple[300],
  Indigo: indigo[300],
  Blue: blue[300],
  Green: green[400],
  Yellow: yellow[600],
  Orange: orange[400],
  Red: red[300],
  Default: "#757575",
};

/** 疊在原本底色上的灰色濾層 */
export const DONE_OVERLAY = "linear-gradient(rgba(150,150,150,.62), rgba(150,150,150,.62))";
export const DARK_DONE_OVERLAY = "linear-gradient(rgba(48,48,48,.72), rgba(48,48,48,.72))";
