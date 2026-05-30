'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/language-context';
import {
  FileText, LayoutDashboard, Users, Building2, ScrollText, LogOut,
  Globe, X, Menu, Shield, Briefcase, User,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard', roles: ['admin', 'director', 'employee'] },
  { href: '/documents', icon: FileText, labelKey: 'documents', roles: ['admin', 'director', 'employee'] },
  { href: '/dashboard/users', icon: Users, labelKey: 'users', roles: ['admin', 'director'] },
  { href: '/dashboard/departments', icon: Building2, labelKey: 'departments', roles: ['admin', 'director'] },
  { href: '/dashboard/logs', icon: ScrollText, labelKey: 'systemLogs', roles: ['admin'] },
];

const roleColors = {
  admin: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', icon: Shield },
  director: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', icon: Briefcase },
  employee: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: User },
};

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { lang, setLang, t } = useLang();

  const role = profile?.role || 'employee';
  const roleConfig = roleColors[role as keyof typeof roleColors];
  const RoleIcon = roleConfig.icon;
  const filteredNav = navItems.filter((item) => item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-slate-900 border-b border-slate-800 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold text-base">SmartDoc</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'en' ? 'uz' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang.toUpperCase()}
          </button>
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Drawer Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-slate-900 border-l border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">SmartDoc</span>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile in drawer */}
        {profile && (
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {profile.avatar_initials || profile.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-white text-sm font-semibold">{profile.full_name}</div>
                <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border mt-1 ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}>
                  <RoleIcon size={9} />
                  {t(role as Parameters<typeof t>[0])}
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNav.map(({ href, icon: Icon, labelKey }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{t(labelKey as Parameters<typeof t>[0])}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <button
            onClick={() => { setLang(lang === 'en' ? 'uz' : 'en'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all text-sm"
          >
            <Globe size={18} />
            <span className="font-medium">{lang === 'en' ? "O'zbekcha" : 'English'}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm"
          >
            <LogOut size={18} />
            <span className="font-medium">{t('signOut')}</span>
          </button>
        </div>
      </div>
    </>
  );
}
