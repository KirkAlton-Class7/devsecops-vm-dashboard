import {
  LayoutDashboard,
  BarChart3,
  Server,
  Cpu,
  DollarSign,
  Wallet,
  Gauge,
  Heart,
} from "lucide-react";
import { mockFinOpsData as enrichedMockFinOpsData } from "./mockFinOpsDashboard";

export const finopsNavItems = [
  { id: "finops-overview", label: "Overview", icon: LayoutDashboard },
  { id: "cost-trends", label: "Cost Trends", icon: BarChart3 },
  { id: "ambience", label: "Ambience", icon: Heart },
  { id: "budgets", label: "Budgets", icon: Wallet },
  { id: "utilization", label: "Utilization", icon: Gauge },
  { id: "idle-resources", label: "Idle Resources", icon: Server },
  { id: "rightsizing", label: "Rightsizing", icon: Cpu },
  { id: "savings", label: "Savings", icon: DollarSign },
];

export const mockFinOpsData = enrichedMockFinOpsData;
