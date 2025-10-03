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
  ArrowLeft,
  Mail,
  History,
  CreditCard
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';

const adminMenuItems = [
  {
    title: 'homePage',
    url: '/',
    icon: Home,
    section: 'home',
    isExternal: true
  },
  {
    title: 'adminOverview',
    url: '/dashboard?tab=overview',
    icon: BarChart3,
    section: 'overview'
  },
  {
    title: 'customers',
    url: '/dashboard?tab=customers', 
    icon: Users,
    section: 'customers'
  },
  {
    title: 'orders',
    url: '/dashboard?tab=orders',
    icon: ShoppingCart,
    section: 'orders'
  },
  {
    title: 'myModels',
    url: '/dashboard?tab=models',
    icon: FileText,
    section: 'models'
  },
  {
    title: 'colors',
    url: '/dashboard?tab=colors',
    icon: Palette,
    section: 'colors'
  },
  {
    title: 'paymentMethods',
    url: '/dashboard?tab=payment-methods',
    icon: CreditCard,
    section: 'payment-methods'
  },
  {
    title: 'notes',
    url: '/dashboard?tab=notes',
    icon: MessageSquare,
    section: 'notes'
  },
  {
    title: 'personalization',
    url: '/dashboard?tab=personalization',
    icon: Palette,
    section: 'personalization'
  },
  {
    title: 'siteSettings',
    url: '/dashboard?tab=site-settings',
    icon: Settings,
    section: 'site-settings'
  },
  {
    title: 'notifications',
    url: '/dashboard?tab=notifications',
    icon: Bell,
    section: 'notifications'
  },
  {
    title: 'email_settings',
    url: '/dashboard?tab=email-settings',
    icon: Mail,
    section: 'email-settings'
  },
  {
    title: 'email_templates',
    url: '/dashboard?tab=email-templates',
    icon: FileText,
    section: 'email-templates'
  },
  {
    title: 'email_logs',
    url: '/dashboard?tab=email-logs',
    icon: History,
    section: 'email-logs'
  },
  {
    title: 'security',
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
  const { language } = useApp();

  const handleNavigation = (section: string, isExternal: boolean = false) => {
    if (isExternal) {
      navigate('/');
    } else {
      onTabChange(section);
      navigate(`/dashboard?tab=${section}`);
    }
    
    // Auto-collapse sidebar on mobile after navigation
    if (window.innerWidth < 768) {
      const sidebarTrigger = document.querySelector('[data-sidebar="trigger"]') as HTMLElement;
      if (sidebarTrigger) {
        sidebarTrigger.click();
      }
    }
  };

  const isActive = (section: string) => currentTab === section;

  return (
    <Sidebar 
      className={state === "collapsed" ? "w-14" : "w-64"} 
      collapsible="icon"
      side="left"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "px-4 py-2 text-sm font-semibold"}>
            Panel administratora
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
                    {state !== "collapsed" && <span>{getText(item.title as any, language)}</span>}
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