import React from "react";

/** 目前的搜尋字串；搜尋中「已完成」區會展開顯示所有符合的卡片 */
export const SearchContext = React.createContext("");

export const useSearchQuery = () => React.useContext(SearchContext);
