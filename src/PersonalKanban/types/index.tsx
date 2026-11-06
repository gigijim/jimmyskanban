/** 便條紙印章：空白（無）、特重要、已完成 */
export type Stamp = "" | "important" | "done";

export type Record = {
  id: string;
  title: string;
  description?: string;
  caption?: string;
  color?: string;
  /** 建立時間（ISO 8601；舊版資料可能是 "DD-MM-YYYY h:mm:ss a"） */
  createdAt?: string;
  /** 最後修改時間（ISO 8601） */
  updatedAt?: string;
  /** 完成時間（ISO 8601），未完成為 null */
  completedAt?: string | null;
  stamp?: Stamp;
};

export type Column = {
  id: string;
  title: string;
  description?: string;
  caption?: string;
  color?: string;
  records?: Record[];
  wipLimit?: number;
  wipEnabled?: boolean;
  createdAt?: string;
};
