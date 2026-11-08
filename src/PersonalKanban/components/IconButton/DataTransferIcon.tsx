import React from "react";
import SvgIcon, { SvgIconProps } from "@material-ui/core/SvgIcon";

/**
 * 資料匯入 / 匯出：資料庫 ⇄ 文件，雙向箭頭。
 * 單色（currentColor），與其他 Material 圖示同風格；箭頭周圍用遮罩挖出細縫，小尺寸也分得清楚。
 */
const ARROWS =
  "M6.8 7.2h4V5.3L13.8 8l-3 2.7V8.8h-4z" + // 往右（匯出到檔案）
  "M14.8 15.2h-2v-1.9L9.8 16l3 2.7v-1.9h2z"; // 往左（從檔案匯入）

const DataTransferIcon: React.FC<SvgIconProps> = (props) => (
  <SvgIcon {...props}>
    <defs>
      <mask id="jk-data-transfer-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#fff" />
        <path d={ARROWS} fill="#000" stroke="#000" strokeWidth="2.2" strokeLinejoin="round" />
      </mask>
    </defs>
    <g mask="url(#jk-data-transfer-mask)">
      {/* 資料庫：三層圓盤 */}
      <ellipse cx="6.5" cy="4.6" rx="5.5" ry="2.3" />
      <path d="M1 7.1v2.9c0 1.27 2.46 2.3 5.5 2.3s5.5-1.03 5.5-2.3V7.1c-1.1.95-3.2 1.5-5.5 1.5S2.1 8.05 1 7.1z" />
      <path d="M1 12.1v2.9c0 1.27 2.46 2.3 5.5 2.3s5.5-1.03 5.5-2.3v-2.9c-1.1.95-3.2 1.5-5.5 1.5S2.1 13.05 1 12.1z" />
      <path d="M1 17.1v2.4c0 1.27 2.46 2.3 5.5 2.3s5.5-1.03 5.5-2.3v-2.4c-1.1.95-3.2 1.5-5.5 1.5S2.1 18.05 1 17.1z" />
      {/* 文件：外框 + 摺角 */}
      <path
        d="M15.6 4.8h4.1l3.1 3.1v13.3h-7.2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M19.4 4.8v3.4h3.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </g>
    <path d={ARROWS} />
  </SvgIcon>
);

export default DataTransferIcon;
