import {
  Brain, Calendar, DoorClosed, Ear, Feather, Key, Landmark, Lock, PenLine, Pointer, Receipt, Ruler, Search, Shield, Star, Target, Wrench, Boxes,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  wrench: Wrench,
  feather: Feather,
  target: Target,
  ruler: Ruler,
  pointer: Pointer,
  ear: Ear,
  search: Search,
  shield: Shield,
  star: Star,
  key: Key,
  receipt: Receipt,
  calendar: Calendar,
  bank: Landmark,
  door: DoorClosed,
  lock: Lock,
  writing: PenLine,
  thinking: Brain,
  spec: Boxes,
};

export function Icon({ name, size = 24, strokeWidth = 2.5, className }: { name: string; size?: number; strokeWidth?: number; className?: string }) {
  const C = ICONS[name] ?? Star;
  return <C size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
