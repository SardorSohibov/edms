'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/language-context';
import {
  FileText, LayoutDashboard, Users, ScrollText, Settings,
  LogOut, ChevronLeft, ChevronRight, Globe, Shield, Briefcase, User,
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ElementType;
  labelKey: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard', roles: ['admin', 'director', 'employee'] },
  { href: '/dashboard/documents', icon: FileText, labelKey: 'documents', roles: ['admin', 'director', 'employee'] },
  { href: '/dashboard/users', icon: Users, labelKey: 'users', roles: ['admin', 'director'] },
  { href: '/dashboard/logs', icon: ScrollText, labelKey: 'systemLogs', roles: ['admin'] },
];

const roleColors = {
  admin: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', icon: Shield },
  director: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: Briefcase },
  employee: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: User },
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { lang, setLang, t } = useLang();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const role = profile?.role || 'employee';
  const roleConfig = roleColors[role as keyof typeof roleColors];
  const RoleIcon = roleConfig.icon;
  const filteredNav = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-slate-800 h-16 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0">
          <FileText className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-base tracking-tight whitespace-nowrap">SmartDoc</div>
            <div className="text-slate-500 text-[10px] whitespace-nowrap">Document Management</div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {filteredNav.map(({ href, icon: Icon, labelKey }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? t(labelKey as Parameters<typeof t>[0]) : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} size={18} />
              {!collapsed && (
                <span className="text-sm font-medium truncate">
                  {t(labelKey as Parameters<typeof t>[0])}
                </span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === 'en' ? 'uz' : 'en')}
          title={collapsed ? (lang === 'en' ? 'Switch to UZ' : 'Switch to EN') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all text-sm ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Globe size={16} className="flex-shrink-0" />
          {!collapsed && <span className="font-medium">{lang === 'en' ? 'English' : "O'zbekcha"}</span>}
          {!collapsed && (
            <span className="ml-auto text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
              {lang.toUpperCase()}
            </span>
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          title={collapsed ? t('signOut') : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span className="font-medium">{t('signOut')}</span>}
        </button>

        {/* Profile */}
        {profile && (
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/60 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {profile.avatar_initials || profile.full_name.slice(0, 2).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="overflow-hidden flex-1 min-w-0">
                <div className="text-white text-xs font-semibold truncate">{profile.full_name}</div>
                <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border mt-0.5 ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}>
                  <RoleIcon size={9} />
                  {t(role as Parameters<typeof t>[0])}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-all text-xs ${
            collapsed ? 'justify-center' : 'justify-end'
          }`}
        >
          {collapsed ? <ChevronRight size={14} /> : (
            <>
              <span>Collapse</span>
              <ChevronLeft size={14} />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
