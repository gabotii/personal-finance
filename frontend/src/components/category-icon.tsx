import { CircleEllipsis } from "lucide-react";

import { CATEGORY_ICONS } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "size-7 rounded-lg [&_svg]:size-3.5",
  md: "size-9 rounded-xl [&_svg]:size-4",
  lg: "size-11 rounded-xl [&_svg]:size-5",
};

/** Tinted tile with the category glyph. Decorative: the category name is always shown next to it. */
export function CategoryIcon({ icon, color, size = "md", className }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[icon] ?? CircleEllipsis;
  return (
    <span
      aria-hidden="true"
      className={cn("grid shrink-0 place-items-center", SIZES[size], className)}
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <Icon />
    </span>
  );
}
