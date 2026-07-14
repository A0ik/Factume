'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/Badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { Crown, Sparkles, ArrowUpRight } from "lucide-react";

const MENU_ITEMS = {
  status: [
    { value: "online", icon: "solar:emoji-funny-circle-line-duotone", label: "En ligne" },
    { value: "offline", icon: "solar:moon-sleep-line-duotone", label: "Hors ligne" }
  ],
  profile: [
    { icon: "solar:user-circle-line-duotone", label: "Mon profil", action: "profile" },
    { icon: "solar:settings-line-duotone", label: "Paramètres", action: "settings" },
    { icon: "solar:bell-line-duotone", label: "Notifications", action: "notifications" },
    { icon: "solar:question-circle-line-duotone", label: "Aide", action: "help" }
  ],
  premium: [
    {
      icon: "solar:star-bold",
      label: "Passer à Pro",
      action: "upgrade",
      iconClass: "text-amber-600",
      badge: { text: "Promo", className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px]" }
    }
  ],
  account: [
    {
      icon: "solar:users-group-rounded-bold-duotone",
      label: "Changer de compte",
      action: "switch",
      showAvatar: false
    },
    { icon: "solar:logout-2-bold-duotone", label: "Se déconnecter", action: "logout" }
  ]
};

const TIER_CONFIG = {
  free: { name: 'Gratuit', gradient: 'from-gray-500 to-gray-600', iconBg: 'bg-gray-100' },
  trial: { name: 'Essai', gradient: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-100' },
  pro: { name: 'Pro', gradient: 'from-emerald-600 to-emerald-700', iconBg: 'bg-emerald-100' },
  business: { name: 'Business', gradient: 'from-emerald-700 to-teal-700', iconBg: 'bg-emerald-100' },
};

export interface UserDropdownUser {
  name: string;
  email?: string;
  initials: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy';
  tier?: string;
  username?: string;
}

export interface UserDropdownProps {
  user?: UserDropdownUser;
  onAction?: (action: string) => void;
  onStatusChange?: (status: string) => void;
  selectedStatus?: string;
  promoDiscount?: string;
}

export const UserDropdown = ({
  user,
  onAction = () => { },
  onStatusChange = () => { },
  selectedStatus = "online",
  promoDiscount = "Promo",
}: UserDropdownProps) => {
  const router = useRouter();
  const { signOut, profile } = useAuthStore();

  // Utiliser les données du profil si user non fourni
  const userData = user || {
    name: profile?.company_name || profile?.first_name || 'Mon compte',
    email: profile?.email,
    initials: getInitials(profile?.company_name || profile?.first_name || 'U'),
    avatar: profile?.logo_url,
    status: 'online' as const,
    tier: profile?.subscription_tier || 'free',
  };

  // OVERLORD (CIBLE 3) — 'solo' legacy → 'pro' (plan supprimé, ne plus afficher 'Solo').
  const tierKey = (userData.tier === 'solo' ? 'pro' : userData.tier) as keyof typeof TIER_CONFIG;
  const tierConfig = TIER_CONFIG[tierKey] || TIER_CONFIG.free;

  const handleAction = async (action: string) => {
    if (action === 'logout') {
      try {
        toast.loading('Déconnexion...', { id: 'logout' });
        await signOut();
        toast.success('Déconnecté', { id: 'logout' });
        router.push('/login');
      } catch {
        toast.error('Erreur déconnexion', { id: 'logout' });
      }
    } else if (action === 'settings') {
      router.push('/settings');
    } else if (action === 'profile') {
      router.push('/settings');
    } else if (action === 'notifications') {
      router.push('/notifications');
    } else if (action === 'help') {
      router.push('/help');
    } else if (action === 'upgrade') {
      router.push('/paywall');
    } else if (action === 'switch') {
      await signOut();
      router.push('/login');
    }
    onAction(action);
  };

  const renderMenuItem = (item: any, index: number) => (
    <DropdownMenuItem
      key={index}
      className={cn((item.badge || item.showAvatar) ? "justify-between" : "", "p-2 rounded-lg cursor-pointer")}
      onClick={() => handleAction(item.action)}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <Icon
          icon={item.icon}
          className={`size-5 ${item.iconClass || "text-gray-500 dark:text-gray-400"}`}
        />
        {item.label}
      </span>
      {item.badge && (
        <Badge className={item.badge.className}>
          {promoDiscount || item.badge.text}
        </Badge>
      )}
      {item.showAvatar && (
        <Avatar className="cursor-pointer size-6 shadow border border-white dark:border-gray-700">
          <AvatarImage src={userData.avatar} alt={userData.name} />
          <AvatarFallback>{userData.initials}</AvatarFallback>
        </Avatar>
      )}
    </DropdownMenuItem>
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      online: "text-green-600 bg-green-100 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-500/50",
      offline: "text-gray-600 bg-gray-100 border-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-600",
      busy: "text-red-600 bg-red-100 border-red-300 dark:text-red-400 dark:bg-red-900/30 dark:border-red-500/50"
    };
    return colors[status.toLowerCase()] || colors.online;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer group">
          <Avatar className="size-8 border border-gray-200 dark:border-gray-700 transition-transform group-hover:scale-105">
            <AvatarImage src={userData.avatar} alt={userData.name} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-white text-xs font-bold">
              {userData.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left hidden lg:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">
              {userData.name}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
              <Crown size={9} className={userData.tier === 'free' ? 'text-gray-400' : 'text-amber-500'} />
              {tierConfig.name}
            </p>
          </div>
          <ArrowUpRight size={14} className="text-gray-400 group-hover:text-primary transition-colors hidden lg:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="no-scrollbar w-[320px] rounded-2xl bg-gray-50 dark:bg-black/90 p-0" align="end" sideOffset={12}>
        <section className="bg-white dark:bg-gray-100/10 backdrop-blur-lg rounded-2xl p-1 shadow border border-gray-200 dark:border-gray-700/20">
          <div className="flex items-center p-3">
            <div className="flex-1 flex items-center gap-3">
              <Avatar className="size-12 border border-gray-200 dark:border-gray-700">
                <AvatarImage src={userData.avatar} alt={userData.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-white font-bold">
                  {userData.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{userData.name}</h3>
                {userData.email && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{userData.email}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", tierConfig.gradient, "bg-gradient-to-r text-white")}>
                    {tierConfig.name}
                  </div>
                  <Badge className={`${getStatusColor(userData.status)} border-[0.5px] text-[10px] rounded-sm capitalize`}>
                    {userData.status === 'online' ? 'En ligne' : userData.status === 'busy' ? 'Occupé' : 'Hors ligne'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {MENU_ITEMS.profile.map(renderMenuItem)}
          </DropdownMenuGroup>

          {userData.tier === 'free' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {MENU_ITEMS.premium.map(renderMenuItem)}
              </DropdownMenuGroup>
            </>
          )}
        </section>

        <section className="mt-1 p-1 rounded-2xl">
          <DropdownMenuGroup>
            {MENU_ITEMS.account.map(renderMenuItem)}
          </DropdownMenuGroup>
        </section>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
