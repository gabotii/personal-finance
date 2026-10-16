import {
  ArrowLeftRight,
  ChartPie,
  LayoutDashboard,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { to: "/categories", label: "Categorías", icon: Tags },
  { to: "/reports", label: "Reportes", icon: ChartPie },
  { to: "/settings", label: "Configuración", icon: Settings },
];
