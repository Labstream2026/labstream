-- TaskStage: estados de tarea editables
CREATE TABLE "TaskStage" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#9aa0a6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TaskStage_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "TaskStage_order_idx" ON "TaskStage"("order");

-- Task.status: enum TaskStatus -> TEXT preservando los valores existentes
ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE TEXT USING "status"::text;
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'TODO';

-- el enum ya no se usa
DROP TYPE IF EXISTS "TaskStatus";

-- Seed de los 5 estados por defecto (idempotente)
INSERT INTO "TaskStage" ("key","label","color","order","isDone","updatedAt") VALUES
  ('TODO','Por hacer','#9aa0a6',0,false,CURRENT_TIMESTAMP),
  ('DOING','En curso','#7b61ff',1,false,CURRENT_TIMESTAMP),
  ('REVIEW','Revisión','#e8640c',2,false,CURRENT_TIMESTAMP),
  ('DONE','Listo','#34c759',3,true,CURRENT_TIMESTAMP),
  ('BLOCKED','Bloqueado','#ef4444',4,false,CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
