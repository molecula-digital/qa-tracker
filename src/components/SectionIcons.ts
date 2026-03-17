import {
  // Project management
  Target, Flag, Milestone, ClipboardList, ListChecks, CheckSquare,
  Timer, Clock, Calendar, CalendarDays, Kanban,
  // Development
  Code, Terminal, Bug, GitBranch, GitPullRequest, Server,
  Cloud, Database, Cpu, Monitor, Smartphone, Wifi,
  // Finance
  DollarSign, CreditCard, Wallet, Receipt, Landmark, PiggyBank,
  TrendingUp, TrendingDown, BarChart2, PieChart, LineChart, Calculator,
  // Communication
  Mail, MessageSquare, Bell, Phone, Video, Megaphone, Send,
  // Content
  FileText, Folder, BookOpen, Newspaper, PenTool, Image, Camera, Music,
  // People/Org
  Users, UserPlus, Briefcase, Building2, GraduationCap, Heart, HandHeart,
  // Objects
  Package, Truck, ShoppingCart, Gift, Key, Lock, Shield, Wrench, Settings, Hammer,
  // Nature/Abstract
  Zap, Star, Rocket, Globe, Map, Sun, Moon, Flame, Leaf, Mountain, Compass,
  // Status
  Activity, Award, Crown, ThumbsUp, AlertTriangle, Info, CircleCheck, Eye,
} from 'lucide-react'

export const SECTION_ICONS = {
  // Project management
  Target, Flag, Milestone, ClipboardList, ListChecks, CheckSquare,
  Timer, Clock, Calendar, CalendarDays, Kanban,
  // Development
  Code, Terminal, Bug, GitBranch, GitPullRequest, Server,
  Cloud, Database, Cpu, Monitor, Smartphone, Wifi,
  // Finance
  DollarSign, CreditCard, Wallet, Receipt, Landmark, PiggyBank,
  TrendingUp, TrendingDown, BarChart2, PieChart, LineChart, Calculator,
  // Communication
  Mail, MessageSquare, Bell, Phone, Video, Megaphone, Send,
  // Content
  FileText, Folder, BookOpen, Newspaper, PenTool, Image, Camera, Music,
  // People/Org
  Users, UserPlus, Briefcase, Building2, GraduationCap, Heart, HandHeart,
  // Objects
  Package, Truck, ShoppingCart, Gift, Key, Lock, Shield, Wrench, Settings, Hammer,
  // Nature/Abstract
  Zap, Star, Rocket, Globe, Map, Sun, Moon, Flame, Leaf, Mountain, Compass,
  // Status
  Activity, Award, Crown, ThumbsUp, AlertTriangle, Info, CircleCheck, Eye,
} as const

export type SectionIconKey = keyof typeof SECTION_ICONS

export const ICON_KEYS: SectionIconKey[] = Object.keys(SECTION_ICONS) as SectionIconKey[]
