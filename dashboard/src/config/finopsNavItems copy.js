import {
  LayoutDashboard,
  BarChart3,
  Server,
  Wallet,
  Shrink,
  Heart,
} from "lucide-react";

export const finopsNavItems = [
  { id: "finops-overview", label: "Overview", icon: LayoutDashboard },
  { id: "cost-trends", label: "Cost Trends", icon: BarChart3 },
  { id: "ambience", label: "Ambience", icon: Heart },
  { id: "budgets", label: "Budgets", icon: Wallet },
  { id: "utilization", label: "Rightsizing", icon: Shrink },
  { id: "idle-resources", label: "Idle Resources", icon: Server },
];