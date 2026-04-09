import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { motion } from "motion/react";
import { GripVertical } from "lucide-react";

const CARD_TYPE = "TRAVEL_CARD";

interface DraggableCardProps {
  id: string;
  index: number;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  children: React.ReactNode;
  animationDelay?: number;
}

export function DraggableCard({ id, index, onMove, children, animationDelay = 0 }: DraggableCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: CARD_TYPE,
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: CARD_TYPE,
    hover(item: { id: string; index: number }, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the item's height
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  preview(drop(ref));

  return (
    <motion.div
      ref={ref}
      className="mb-4 break-inside-avoid relative group/drag"
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: isDragging ? 0.4 : 1,
        y: 0,
        scale: isDragging ? 0.97 : 1,
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
        delay: animationDelay,
      }}
      style={{
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* Drag handle */}
      <div
        ref={(node) => { drag(node); }}
        className="absolute top-2 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover/drag:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-0.5 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full shadow-lg">
          <GripVertical size={12} />
          <span style={{ fontSize: "10px", fontWeight: 600 }}>Drag</span>
        </div>
      </div>

      {/* Drop indicator */}
      {isOver && !isDragging && (
        <div className="absolute -top-1.5 left-0 right-0 h-[3px] bg-[#4a9fd8] rounded-full z-30" />
      )}

      {children}
    </motion.div>
  );
}