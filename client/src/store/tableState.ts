import { atom } from "recoil";
import { TableWithOrder } from "@/types/table-types";

export const selectedTableState = atom<TableWithOrder | null>({
  key: "selectedTableState",
  default: null,
}); 