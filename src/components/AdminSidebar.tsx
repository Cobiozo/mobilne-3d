import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { 
  Users, 
  ShoppingCart, 
  Settings, 
  BarChart3, 
  FileText, 
  MessageSquare,
  Palette,
  Globe,
  Bell,
  Shield,
  Home,
  ArrowLeft
} from 'lucide-react';

const adminMenuItems = [
  {
    title: 'Strona główna',
    url: '/',
    icon: Home,
    section: 'home',
    isExternal: true
  },
  {
    title: 'Dashboard',
    url: '/dashboard?tab=overview',
    icon: BarChart3,
    section: 'overview'
  },
  {
    title: 'Klienci',
    url: '/dashboard?tab=customers', 
    icon: Users,
    section: 'customers'
  },
  {
    title: 'Zamówienia',
    url: '/dashboard?tab=orders',
    icon: ShoppingCart,
    section: 'orders'
  },
  {
    title: 'Modele 3D',
    url: '/dashboard?tab=models',
    icon: FileText,
    section: 'models'
  },
  {
    title: 'Notatki',
    url: '/dashboard?tab=notes',
    icon: MessageSquare,
    section: 'notes'
  },
  {
    title: 'Personalizacja',
    url: '/dashboard?tab=customization',
    icon: Palette,
    section: 'customization'
  },
  {
    title: 'Ustawienia strony',
    url: '/dashboard?tab=site-settings',
    icon: Globe,
    section: 'site-settings'
  },
  {
    title: 'Powiadomienia',
    url: '/dashboard?tab=notifications',
    icon: Bell,
    section: 'notifications'
  },
  {
    title: 'Bezpieczeństwo',
    url: '/dashboard?tab=security',
    icon: Shield,
    section: 'security'
  }
];

interface AdminSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminSidebar({ currentTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const navigate = useNavigate();

  const handleNavigation = (section: string, isExternal: boolean = false) => {
    if (isExternal) {
      navigate('/');
    } else {
      onTabChange(section);
      navigate(`/dashboard?tab=${section}`);
    }
  };

  const isActive = (section: string) => currentTab === section;

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : ""}>
            Panel Administratora
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.section}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.section, item.isExternal)}
                    className={isActive(item.section) 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted/50"
                    }
                  >
                    <item.icon className={`h-4 w-4 ${state === "collapsed" ? "" : "mr-2"}`} />
                    {state !== "collapsed" && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}