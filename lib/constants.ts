import type { OrderStatus, ProcessType, Role } from "@/lib/types";

export const ROLES: Role[] = ["팀장", "대표"];

export const PROCESS_OPTIONS: ProcessType[] = ["복층", "강화", "접합", "창호", "기타"];

export const STATUS_OPTIONS: OrderStatus[] = ["등록", "확인필요", "진행", "완료", "보류"];
