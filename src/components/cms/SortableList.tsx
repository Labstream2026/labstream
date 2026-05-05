"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type SortableItem = { id: string; content: ReactNode };

type Props = {
  items: SortableItem[];
  /** Server action — receives FormData with `orderedIds` (newline-separated). */
  reorderAction: (formData: FormData) => void;
};

export function SortableList({ items: initial, reorderAction }: Props) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    const fd = new FormData();
    fd.set("orderedIds", next.map((n) => n.id).join("\n"));
    startTransition(() => reorderAction(fd));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id} dimmed={pending}>
              {item.content}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
  dimmed,
}: {
  id: string;
  children: ReactNode;
  dimmed?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : dimmed ? 0.7 : 1,
      }}
      className="relative"
    >
      <button
        type="button"
        aria-label="Arrastrar para reordenar"
        title="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
        className="absolute left-2 top-3 z-10 flex h-6 w-6 cursor-grab items-center justify-center rounded text-white/35 hover:bg-white/5 hover:text-white/75 active:cursor-grabbing"
      >
        ⋮⋮
      </button>
      <div className="pl-7">{children}</div>
    </div>
  );
}
