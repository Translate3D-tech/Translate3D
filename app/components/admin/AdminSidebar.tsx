import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  Newspaper,
  ShoppingCart,
  Truck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { LogoIcon } from '~/components/LogoIcon';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

export type AdminNavItem = {
  id: string;
  name: string;
  href: string;
};

export type AdminNavSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  items?: AdminNavItem[];
  href?: string;
};

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'tienda',
    title: 'Tienda',
    icon: ShoppingCart,
    items: [
      { id: 'tienda-modelos-3d', name: 'Modelos 3D', href: '/admin?view=tienda-modelos-3d' },
      { id: 'tienda-filamentos', name: 'Filamentos', href: '/admin?view=tienda-filamentos' },
      { id: 'tienda-resinas', name: 'Resinas', href: '/admin?view=tienda-resinas' },
      { id: 'tienda-refacciones', name: 'Refacciones', href: '/admin?view=tienda-refacciones' },
    ],
  },
  {
    id: 'pedidos',
    title: 'Pedidos',
    icon: Truck,
    href: '/admin?view=pedidos-todos',
  },
  {
    id: 'servicios',
    title: 'Servicios',
    icon: ClipboardList,
    href: '/admin?view=servicios-solicitudes',
  },
  {
    id: 'blog',
    title: 'Blog',
    icon: Newspaper,
    href: '/admin?view=blog-articulos',
  },
  // {
  //   id: 'secciones-del-sitio',
  //   title: 'Secciones del sitio',
  //   icon: Newspaper,
  //   items: [
  //     {id: 'sitio-historia', name: 'Historia', href: '/admin?view=sitio-historia'},
  //     {id: 'sitio-equipo', name: 'Equipo', href: '/admin?view=sitio-equipo'},
  //     {id: 'sitio-compromiso', name: 'Compromiso', href: '/admin?view=sitio-compromiso'},
  //     {
  //       id: 'sitio-preguntas-frecuentes',
  //       name: 'Preguntas Frecuentes',
  //       href: '/admin?view=sitio-preguntas-frecuentes',
  //     },
  //     {
  //       id: 'sitio-politicas-de-privacidad',
  //       name: 'Politicas de Privacidad',
  //       href: '/admin?view=sitio-politicas-de-privacidad',
  //     },
  //     {
  //       id: 'sitio-terminos-y-condiciones',
  //       name: 'Terminos y Condiciones',
  //       href: '/admin?view=sitio-terminos-y-condiciones',
  //     },
  //     {
  //       id: 'sitio-garantias-y-reembolsos',
  //       name: 'Garantias y Reembolsos',
  //       href: '/admin?view=sitio-garantias-y-reembolsos',
  //     },
  //   ],
  // },
  // {
  //   id: 'galeria-de-modelos',
  //   title: 'Galeria de modelos',
  //   icon: Box,
  //   items: [{id: 'galeria-modelos-3d', name: 'Modelos 3D', href: '/admin?view=galeria-modelos-3d'}],
  // },
  // {
  //   id: 'otro',
  //   title: 'Otro',
  //   icon: ShoppingCart,
  // },
];

const dropdownVariants = {
  open: { opacity: 1, height: 'auto', transition: { duration: 0.2, ease: 'easeInOut' } },
  closed: { opacity: 0, height: 0, transition: { duration: 0.2, ease: 'easeInOut' } },
} as const;

function sectionForView(view: string | null) {
  if (!view) return null;

  // Check direct-link sections first
  const directMatch = ADMIN_NAV_SECTIONS.find(
    (section) => section.href && !section.items?.length && section.href.includes(view),
  );
  if (directMatch) return directMatch.id;

  return (
    ADMIN_NAV_SECTIONS.find((section) => section.items?.some((item) => item.id === view || item.href.includes(view)))
      ?.id ?? null
  );
}

function itemByView(view: string | null) {
  if (!view) return null;

  return (
    ADMIN_NAV_SECTIONS.flatMap((section) => section.items ?? []).find(
      (item) => item.id === view || item.href.includes(view),
    ) ?? null
  );
}

export function resolveAdminView(view: string | null) {
  if (!view) return ADMIN_NAV_SECTIONS[0]?.items?.[0]?.id ?? 'tienda-modelos-3d';

  const found = itemByView(view);
  if (found) return found.id;

  // Check direct-link sections
  const directSection = ADMIN_NAV_SECTIONS.find(
    (section) => section.href && !section.items?.length && section.href.includes(view),
  );
  if (directSection) return view;

  if (view === 'otro') return 'otro';

  return ADMIN_NAV_SECTIONS[0]?.items?.[0]?.id ?? 'tienda-modelos-3d';
}

export function resolveAdminSelection(view: string | null) {
  const resolvedView = resolveAdminView(view);

  if (resolvedView === 'otro') {
    const section = ADMIN_NAV_SECTIONS.find((candidate) => candidate.id === 'otro');
    return {
      view: resolvedView,
      sectionTitle: section?.title ?? 'Otro',
      itemTitle: 'Otro',
    };
  }

  // Check direct-link sections
  const directSection = ADMIN_NAV_SECTIONS.find(
    (section) => section.href && !section.items?.length && section.href.includes(resolvedView),
  );
  if (directSection) {
    return {
      view: resolvedView,
      sectionTitle: directSection.title,
      itemTitle: directSection.title,
    };
  }

  const item = itemByView(resolvedView);
  const section = sectionForView(resolvedView);

  return {
    view: resolvedView,
    sectionTitle: ADMIN_NAV_SECTIONS.find((candidate) => candidate.id === section)?.title ?? 'Tienda',
    itemTitle: item?.name ?? 'Modelos 3D',
  };
}

export function AdminSidebar({
  activeView,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  viewerLabel,
}: {
  activeView: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  viewerLabel?: string;
}) {
  const defaultOpenSections = useMemo(() => {
    const section = sectionForView(activeView);
    return section ? [section] : [];
  }, [activeView]);
  const [openSections, setOpenSections] = useState<string[]>(defaultOpenSections);

  useEffect(() => {
    if (defaultOpenSections.length === 0) return;
    setOpenSections((current) => {
      const next = new Set(current);
      defaultOpenSections.forEach((sectionId) => next.add(sectionId));
      return Array.from(next);
    });
  }, [defaultOpenSections]);
  const effectiveCollapsed = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={onMobileClose}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      ) : null}

      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex h-[100dvh] flex-col border-r border-[#cfcfcf] bg-white p-2.5 text-[14px] font-medium text-gray-500 transition-all duration-200 md:relative md:z-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          effectiveCollapsed ? 'w-full md:w-[88px]' : 'w-full md:w-[300px]',
        )}
      >
        <div className={cn('flex items-center', effectiveCollapsed ? 'justify-center' : 'justify-between')}>
          <Link
            to="/"
            onClick={onMobileClose}
            className={cn('flex items-center text-dark', effectiveCollapsed ? 'justify-center' : 'gap-2')}
          >
            <LogoIcon className="w-10" />
            <span className={cn('text-lg font-bold', effectiveCollapsed && 'hidden')}>Translate3D</span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Cerrar menu"
              onClick={onMobileClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 flex-col justify-between gap-4">
          <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto pr-1">
            {ADMIN_NAV_SECTIONS.map((section) => {
              const Icon = section.icon;
              const hasItems = Boolean(section.items?.length);
              const isDirectLink = Boolean(section.href) && !hasItems;
              const isOpen = openSections.includes(section.id);
              const isSectionActive =
                activeView === section.id ||
                section.items?.some((item) => item.id === activeView) ||
                (isDirectLink && section.href?.includes(activeView)) ||
                (!hasItems && !isDirectLink && section.id === 'otro' && activeView === 'otro');

              return (
                <div key={section.id} className="select-none">
                  {isDirectLink ? (
                    <Link
                      to={section.href!}
                      onClick={onMobileClose}
                      className={cn(
                        'flex w-full items-center rounded p-1.5 hover:bg-gray-100',
                        effectiveCollapsed ? 'justify-center' : 'gap-2',
                        isSectionActive && 'text-primary',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={cn(effectiveCollapsed && 'sr-only')}>{section.title}</span>
                    </Link>
                  ) : hasItems ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (effectiveCollapsed) {
                          onToggleCollapse();
                          setOpenSections((current) =>
                            current.includes(section.id) ? current : [...current, section.id],
                          );
                          return;
                        }
                        setOpenSections((current) =>
                          current.includes(section.id)
                            ? current.filter((id) => id !== section.id)
                            : [...current, section.id],
                        );
                      }}
                      className={cn(
                        'flex w-full items-center rounded p-1.5 text-left hover:bg-gray-100',
                        effectiveCollapsed ? 'justify-center' : 'justify-between gap-6',
                        isSectionActive && 'text-primary',
                      )}
                    >
                      <span className={cn('flex items-center', effectiveCollapsed ? 'justify-center' : 'gap-2')}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={cn(effectiveCollapsed && 'sr-only')}>{section.title}</span>
                      </span>
                      {!effectiveCollapsed ? (
                        <motion.span
                          animate={{ rotate: isOpen ? 90 : 0 }}
                          transition={{ duration: 0.05 }}
                          className="flex h-4 w-4 items-center justify-center"
                          style={{ transformOrigin: 'center' }}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </motion.span>
                      ) : null}
                    </button>
                  ) : (
                    <Link
                      to="/admin?view=otro"
                      onClick={onMobileClose}
                      className={cn(
                        'flex w-full items-center rounded p-1.5 hover:bg-gray-100',
                        effectiveCollapsed ? 'justify-center' : 'justify-between gap-6',
                        isSectionActive && 'text-primary',
                      )}
                    >
                      <span className={cn('flex items-center', effectiveCollapsed ? 'justify-center' : 'gap-2')}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={cn(effectiveCollapsed && 'sr-only')}>{section.title}</span>
                      </span>
                    </Link>
                  )}

                  <AnimatePresence initial={false}>
                    {!effectiveCollapsed && isOpen && hasItems ? (
                      <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={dropdownVariants}
                        className="overflow-hidden"
                      >
                        {section.items?.map((item) => (
                          <Link
                            to={item.href}
                            onClick={onMobileClose}
                            key={item.id}
                            className={cn(
                              'ml-6 flex items-center gap-2 border-l border-dark/15 py-1.5 pl-4 pr-1 text-sm hover:bg-gray-100',
                              activeView === item.id && 'text-primary',
                            )}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <Button asChild variant="action" className={cn('w-full', effectiveCollapsed ? 'justify-center px-1' : 'justify-start px-1')}>
            <Link to="/account" onClick={onMobileClose}>
              <CircleUserRound className="h-4 w-4 shrink-0" />
              <span className={cn('min-w-0 flex-1 truncate text-left', effectiveCollapsed && 'hidden')}>
                {viewerLabel || 'Mi perfil'}
              </span>
            </Link>
          </Button>
        </div>
      </nav>

      <button
        type="button"
        aria-label={effectiveCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        onClick={onToggleCollapse}
        className={cn(
          'fixed top-24 z-50 hidden h-12 w-6 -translate-x-1/2 rounded-r-[4px] border border-l-0 border-[#cfcfcf] bg-white text-dark shadow-sm transition-colors hover:bg-light md:inline-flex md:items-center md:justify-center',
          effectiveCollapsed ? 'left-[100px]' : 'left-[312px]',
        )}
      >
        {effectiveCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </>
  );
}
