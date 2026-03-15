import {
  // Financial
  DollarSign, TrendingUp, TrendingDown, BarChart2, BarChart3,
  LineChart, PieChart, CreditCard, Wallet, Receipt,
  Landmark, Percent, Calculator, Banknote, ArrowUpRight,
  ArrowDownRight, HandCoins, CircleDollarSign, ShieldCheck, PiggyBank,
  // Generic
  Star, Flag, Target, Zap, Shield, Globe, Users, Settings,
  Calendar, Bell, Rocket, Heart, Code, Database, Package,
  Briefcase, Home, Mail, BookOpen, FileText, Folder, Award,
  Gift, Lock, Timer, Activity, Layers, CheckSquare, ListChecks,
} from 'lucide-react'

export const SECTION_ICONS = {
  // Financial
  DollarSign, TrendingUp, TrendingDown, BarChart2, BarChart3,
  LineChart, PieChart, CreditCard, Wallet, Receipt,
  Landmark, Percent, Calculator, Banknote, ArrowUpRight,
  ArrowDownRight, HandCoins, CircleDollarSign, ShieldCheck, PiggyBank,
  // Generic
  Star, Flag, Target, Zap, Shield, Globe, Users, Settings,
  Calendar, Bell, Rocket, Heart, Code, Database, Package,
  Briefcase, Home, Mail, BookOpen, FileText, Folder, Award,
  Gift, Lock, Timer, Activity, Layers, CheckSquare, ListChecks,
} as const

export type SectionIconKey = keyof typeof SECTION_ICONS

export const ICON_GROUPS = [
  {
    label: 'Financial',
    keys: [
      'DollarSign', 'CircleDollarSign', 'Banknote', 'CreditCard', 'Wallet',
      'HandCoins', 'PiggyBank', 'Receipt', 'Landmark', 'Calculator',
      'Percent', 'TrendingUp', 'TrendingDown', 'ArrowUpRight', 'ArrowDownRight',
      'BarChart2', 'BarChart3', 'LineChart', 'PieChart', 'ShieldCheck',
    ] as SectionIconKey[],
  },
  {
    label: 'General',
    keys: [
      'Briefcase', 'Target', 'Flag', 'Star', 'Award',
      'CheckSquare', 'ListChecks', 'FileText', 'Folder', 'BookOpen',
      'Calendar', 'Timer', 'Bell', 'Mail', 'Globe',
      'Users', 'Home', 'Package', 'Database', 'Settings',
      'Shield', 'Lock', 'Code', 'Activity', 'Layers',
      'Heart', 'Rocket', 'Gift', 'Zap', 'Mail',
    ] as SectionIconKey[],
  },
]
