import { prisma } from "@/lib/prisma";

export type TaskStageDTO = {
  key: string;
  label: string;
  color: string;
  order: number;
  isDone: boolean;
};

/** Estados por defecto (respaldo si la tabla está vacía). */
export const DEFAULT_TASK_STAGES: TaskStageDTO[] = [
  { key: "TODO", label: "Por hacer", color: "#9aa0a6", order: 0, isDone: false },
  { key: "DOING", label: "En curso", color: "#7b61ff", order: 1, isDone: false },
  { key: "REVIEW", label: "Revisión", color: "#e8640c", order: 2, isDone: false },
  { key: "DONE", label: "Listo", color: "#34c759", order: 3, isDone: true },
  { key: "BLOCKED", label: "Bloqueado", color: "#ef4444", order: 4, isDone: false },
];

/** Estados de tarea ordenados (editables desde /app/stages). */
export async function getTaskStages(): Promise<TaskStageDTO[]> {
  const rows = await prisma.taskStage.findMany({ orderBy: { order: "asc" } });
  return rows.length > 0 ? rows : DEFAULT_TASK_STAGES;
}

/** Mapa key → stage para resolver label/color al renderizar. */
export function stagesByKey(stages: TaskStageDTO[]): Map<string, TaskStageDTO> {
  return new Map(stages.map((s) => [s.key, s]));
}

/** Claves de los estados NO terminados (para “tareas pendientes/próximas”). */
export function pendingStageKeys(stages: TaskStageDTO[]): string[] {
  return stages.filter((s) => !s.isDone).map((s) => s.key);
}
