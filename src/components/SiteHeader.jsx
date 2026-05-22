import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { terms } from '../data/seededContent';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import NotificationsBell from './NotificationsBell';

const courseCategoryOrder = [
  'upcoming-live-workshops',
  'upcoming-live-session',
  'recorded-live-workshop',
  'hands-on-classes',
  'e-book',
];

const onlineWorkshopNavSlugs = ['upcoming-live-workshops', 'recorded-live-workshop', 'e-book'];
const onlineWorkshopNavLabelBySlug = new Map([
  ['upcoming-live-workshops', 'Upcoming Live Workshops'],
  ['recorded-live-workshop', 'Recorded Live Workshops'],
  ['e-book', 'E-Books'],
]);

export default function SiteHeader({ onCartClick }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const activeCourseCategory = useMemo(() => {
    if (location.pathname !== '/courses') return '';
    try {
      return new URLSearchParams(location.search).get('category') || '';
    } catch {
      return '';
    }
  }, [location.pathname, location.search]);
  const [courseCategories, setCourseCategories] = useState(() =>
    (terms?.courseCategories ?? [])
      .slice()
      .sort((a, b) => courseCategoryOrder.indexOf(a.slug) - courseCategoryOrder.indexOf(b.slug))
      .filter(Boolean),
  );
  const [recipeCategories, setRecipeCategories] = useState(() => (terms?.postCategories ?? []).filter((t) => t.slug !== 'uncategorized'));
  const navRef = useRef(null);
  const cartCount = useCartStore((state) => state.items.length);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const setSession = useAuthStore((state) => state.setSession);
  const role = useAuthStore((state) => state.user?.role ?? '');
  const [returnAdminSession, setReturnAdminSession] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem('lf:return_admin');
      setReturnAdminSession(raw ? JSON.parse(raw) : null);
    } catch {
      setReturnAdminSession(null);
    }
  }, [token]);

  const canReturnToAdmin = Boolean(
    token &&
      returnAdminSession?.token &&
      (returnAdminSession?.user?.role === 'admin' || returnAdminSession?.user?.role === 'super_admin') &&
      role !== 'admin' &&
      role !== 'super_admin',
  );

  const returnToAdmin = () => {
    if (!canReturnToAdmin) return;
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem('lf:return_admin');
    } catch {
      // ignore
    }
    setSession({ token: returnAdminSession.token, user: returnAdminSession.user });
  };

  // Header search
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ recipes: [], workshops: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (!searchOpen) return;
    if (!searchQuery || String(searchQuery).trim() === '') {
      setSearchResults({ recipes: [], workshops: [] });
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      api.public.search({ q: searchQuery })
        .then((res) => {
          setSearchResults(res || { recipes: [], workshops: [] });
        })
        .catch(() => setSearchResults({ recipes: [], workshops: [] }))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [searchOpen, searchQuery]);

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => {
      const el = document.querySelector('.header-search-input');
      if (el) el.focus();
    }, 50);
  }

  function onResultClick(type, slug) {
    setSearchOpen(false);
    setSearchQuery('');
    if (type === 'recipe') navigate(`/recipes/${encodeURIComponent(slug)}`);
    else if (type === 'workshop') navigate(`/courses/${encodeURIComponent(slug)}`);
  }

  useEffect(() => {
    let active = true;
    Promise.all([api.public.categories.list('course'), api.public.categories.list('recipe')])
      .then(([courseData, recipeData]) => {
        if (!active) return;
        const courseMap = new Map((terms?.courseCategories ?? []).map((item) => [item.slug, item]));
        for (const item of courseData.categories ?? []) {
          courseMap.set(item.slug, item);
        }
        const recipeMap = new Map((terms?.postCategories ?? []).map((item) => [item.slug, item]));
        for (const item of recipeData.categories ?? []) {
          if (item.slug !== 'uncategorized') recipeMap.set(item.slug, item);
        }
        setCourseCategories(
          Array.from(courseMap.values())
            .filter(Boolean)
            .slice()
            .sort((a, b) => {
              const aIdx = courseCategoryOrder.indexOf(a.slug);
              const bIdx = courseCategoryOrder.indexOf(b.slug);
              const aRank = aIdx === -1 ? 999 : aIdx;
              const bRank = bIdx === -1 ? 999 : bIdx;
              if (aRank !== bRank) return aRank - bRank;
              return String(a.name ?? a.slug ?? '').localeCompare(String(b.name ?? b.slug ?? ''));
            }),
        );
        setRecipeCategories(Array.from(recipeMap.values()).filter((item) => item.slug !== 'uncategorized'));
      })
      .catch(() => {
        if (!active) return;
        setCourseCategories(
          (terms?.courseCategories ?? [])
            .slice()
            .sort((a, b) => courseCategoryOrder.indexOf(a.slug) - courseCategoryOrder.indexOf(b.slug))
            .filter(Boolean),
        );
        setRecipeCategories((terms?.postCategories ?? []).filter((t) => t.slug !== 'uncategorized'));
      });

    return () => {
      active = false;
    };
  }, []);

  const courseHrefBySlug = useMemo(() => {
    const map = new Map();
    for (const cat of courseCategories) map.set(cat.slug, `/courses?category=${encodeURIComponent(cat.slug)}`);
    return map;
  }, [courseCategories]);

  const onlineWorkshopCategories = useMemo(() => {
    const list = Array.isArray(courseCategories) ? courseCategories : [];
    const bySlug = new Map(list.map((cat) => [String(cat.slug ?? ''), cat]));
    return onlineWorkshopNavSlugs.map((slug) => bySlug.get(slug)).filter(Boolean);
  }, [courseCategories]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }

    function onPointerDown(e) {
      if (!navRef.current) return;
      if (navRef.current.contains(e.target)) return;
      setOpenMenu(null);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    setOpenMenu(null);
  }, [mobileOpen]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const className = 'no-scroll';
    const body = document.body;
    if (mobileOpen) body.classList.add(className);
    else body.classList.remove(className);
    return () => body.classList.remove(className);
  }, [mobileOpen]);

  function handleDropdownBlur(e) {
    const current = e.currentTarget;
    const next = e.relatedTarget;
    // On some mobile browsers `relatedTarget` is null and focus doesn't move predictably.
    // In that case, rely on the global outside-click handler + Escape to close.
    if (!next) return;
    if (current.contains(next)) return;
    setOpenMenu(null);
  }

  const overlayHeader = location.pathname === '/' && !scrolled && !mobileOpen;

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}${overlayHeader ? ' is-overlay' : ''}`}>
      <div className="container-wide header-inner" ref={navRef}>
        <button
          className="icon-button header-burger"
          type="button"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span aria-hidden="true">{mobileOpen ? '×' : '≡'}</span>
        </button>

        <NavLink className="brand" to="/" onClick={() => setMobileOpen(false)}>
          <span className="brand-lockup">
            <img className="brand-logo" src="/brand/logo.png" alt="Love & Flour by Pooja" />
          </span>
        </NavLink>

        <nav className="header-nav" aria-label="Primary navigation">
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} to="/" end>
            Home
          </NavLink>
          <NavLink className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} to="/about">
            About
          </NavLink>

          <div
            className={`nav-dropdown${openMenu === 'courses' ? ' is-open' : ''}`}
            onMouseEnter={() => setOpenMenu('courses')}
            onMouseLeave={() => setOpenMenu(null)}
            onFocusCapture={() => setOpenMenu('courses')}
            onBlurCapture={handleDropdownBlur}
          >
            <button
              className="nav-link nav-link-button"
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenu === 'courses'}
              onClick={() => setOpenMenu((v) => (v === 'courses' ? null : 'courses'))}
            >
              Online Workshops <span className="nav-caret" aria-hidden="true">▾</span>
            </button>
            {openMenu === 'courses' ? (
              <div className="dropdown-panel" role="menu">
                {onlineWorkshopCategories.map((cat) => (
                  <NavLink
                    key={cat.slug}
                    className="dropdown-link"
                    to={courseHrefBySlug.get(cat.slug)}
                    onClick={() => setOpenMenu(null)}
                  >
                    {onlineWorkshopNavLabelBySlug.get(cat.slug) ?? cat.name}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>

          <NavLink
            className={() =>
              `nav-link${location.pathname === '/courses' && activeCourseCategory === 'hands-on-classes' ? ' is-active' : ''}`
            }
            to="/courses?category=hands-on-classes"
          >
            Hands-On Classes
          </NavLink>

          <div
            className={`nav-dropdown${openMenu === 'recipes' ? ' is-open' : ''}`}
            onMouseEnter={() => setOpenMenu('recipes')}
            onMouseLeave={() => setOpenMenu(null)}
            onFocusCapture={() => setOpenMenu('recipes')}
            onBlurCapture={handleDropdownBlur}
          >
            <button
              className="nav-link nav-link-button"
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenu === 'recipes'}
              onClick={() => setOpenMenu((v) => (v === 'recipes' ? null : 'recipes'))}
            >
              Recipe Library <span className="nav-caret" aria-hidden="true">▾</span>
            </button>
            {openMenu === 'recipes' ? (
              <div className="dropdown-panel dropdown-panel-wide" role="menu">
                <NavLink className="dropdown-link dropdown-link-strong" to="/recipe-library" onClick={() => setOpenMenu(null)}>
                  All Recipes
                </NavLink>
                {recipeCategories.map((cat) => (
                  <NavLink
                    key={cat.slug}
                    className="dropdown-link"
                    to={`/recipe-library?category=${encodeURIComponent(cat.slug)}`}
                    onClick={() => setOpenMenu(null)}
                  >
                    {cat.name}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>

          <NavLink className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} to="/contact">
            Contact
          </NavLink>
        </nav>

        <div className="header-actions">
          <div className={`header-search${searchOpen ? ' is-open' : ''}`}>
            <button
              className="icon-button header-search-toggle"
              type="button"
              aria-label="Search"
              onClick={() => (searchOpen ? setSearchOpen(false) : openSearch())}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
            <div className="header-search-box" role="dialog" aria-label="Site search">
              <input
                className="input header-search-input"
                placeholder="Search recipes & workshops…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
              />
              {searchOpen ? (
                <div className="search-dropdown" role="list">
                  {searchLoading ? <div className="search-loading">Searching…</div> : null}
                  {(!searchLoading && searchResults.recipes?.length > 0) ? (
                    <div className="search-section">
                      <div className="search-section-title">Recipes</div>
                      {searchResults.recipes.slice(0,5).map((r) => (
                        <button key={r.slug} className="search-item" type="button" onClick={() => onResultClick('recipe', r.slug)}>
                          <div className="search-item-title">{r.title ?? r.name}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {(!searchLoading && searchResults.workshops?.length > 0) ? (
                    <div className="search-section">
                      <div className="search-section-title">Workshops</div>
                      {searchResults.workshops.slice(0,5).map((w) => (
                        <button key={w.slug} className="search-item" type="button" onClick={() => onResultClick('workshop', w.slug)}>
                          <div className="search-item-title">{w.title ?? w.name}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {!searchLoading && searchResults.recipes.length === 0 && searchResults.workshops.length === 0 ? (
                    <div className="search-empty muted">No results</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <button className="icon-button header-cart" type="button" onClick={onCartClick} aria-label={`Open cart (${cartCount})`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path
                d="M6.5 6.5H21l-1.6 7.2a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.6L5.2 3.8H3"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.8 21a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm8.2 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Z"
                fill="currentColor"
              />
            </svg>
            {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
          </button>
          {token ? (
            <>
              {canReturnToAdmin ? (
                <button className="nav-link nav-link-action" type="button" onClick={returnToAdmin}>
                  Return to admin
                </button>
              ) : null}
              {role === 'admin' || role === 'super_admin' ? <NotificationsBell token={token} enabled /> : null}
              {role === 'admin' || role === 'super_admin' ? (
                <NavLink className={({ isActive }) => `nav-link nav-link-action${isActive ? ' is-active' : ''}`} to="/admin/dashboard">
                  Admin
                </NavLink>
              ) : null}
              {role === 'instructor' ? (
                <NavLink className={({ isActive }) => `nav-link nav-link-action${isActive ? ' is-active' : ''}`} to="/instructor/dashboard">
                  Instructor
                </NavLink>
              ) : null}
              {role !== 'admin' && role !== 'super_admin' ? (
                <NavLink className={({ isActive }) => `nav-link nav-link-action${isActive ? ' is-active' : ''}`} to="/dashboard">
                  Dashboard
                </NavLink>
              ) : null}
              <NavLink className={({ isActive }) => `nav-link nav-link-action${isActive ? ' is-active' : ''}`} to="/profile">
                Profile
              </NavLink>
              <button className="nav-link nav-link-action" type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink className="nav-link nav-link-action nav-link-icon" to="/login" aria-label="Login">
              <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path
                  d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4.5 20.2a7.5 7.5 0 0 1 15 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </NavLink>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-nav-overlay" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="mobile-nav-backdrop" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <nav className="mobile-nav-panel is-open" aria-label="Mobile navigation">
            <div className="mobile-nav-head">
              <span className="mobile-nav-title">Menu</span>
              <button className="icon-button mobile-nav-close" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="mobile-nav-inner">
              <NavLink className="mobile-nav-link" to="/" onClick={() => setMobileOpen(false)} end>
                Home
              </NavLink>
              <NavLink className="mobile-nav-link" to="/about" onClick={() => setMobileOpen(false)}>
                About
              </NavLink>

              <details className="mobile-nav-group">
                <summary className="mobile-nav-link mobile-nav-summary">Online Workshops</summary>
                <div className="mobile-nav-group-inner">
                  {onlineWorkshopCategories.map((cat) => (
                    <NavLink
                      key={cat.slug}
                      className="mobile-nav-link mobile-nav-sublink"
                      to={`/courses?category=${encodeURIComponent(cat.slug)}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {onlineWorkshopNavLabelBySlug.get(cat.slug) ?? cat.name}
                    </NavLink>
                  ))}
                </div>
              </details>

              <details className="mobile-nav-group">
                <summary className="mobile-nav-link mobile-nav-summary">Recipe Library</summary>
                <div className="mobile-nav-group-inner">
                  <NavLink className="mobile-nav-link mobile-nav-sublink" to="/recipe-library" onClick={() => setMobileOpen(false)}>
                    All Recipes
                  </NavLink>
                  {recipeCategories.map((cat) => (
                    <NavLink
                      key={cat.slug}
                      className="mobile-nav-link mobile-nav-sublink"
                      to={`/recipe-library?category=${encodeURIComponent(cat.slug)}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {cat.name}
                    </NavLink>
                  ))}
                </div>
              </details>

              <NavLink className="mobile-nav-link" to="/contact" onClick={() => setMobileOpen(false)}>
                Contact
              </NavLink>

              <div className="mobile-nav-divider" aria-hidden="true" />

              {token ? (
                <div className="mobile-nav-account">
                  {role === 'admin' || role === 'super_admin' ? (
                    <NavLink className="mobile-nav-link" to="/admin/dashboard" onClick={() => setMobileOpen(false)}>
                      Admin
                    </NavLink>
                  ) : null}
                  {role === 'instructor' ? (
                    <NavLink className="mobile-nav-link" to="/instructor/dashboard" onClick={() => setMobileOpen(false)}>
                      Instructor
                    </NavLink>
                  ) : null}
                  {role !== 'admin' && role !== 'super_admin' ? (
                    <NavLink className="mobile-nav-link" to="/dashboard" onClick={() => setMobileOpen(false)}>
                      Dashboard
                    </NavLink>
                  ) : null}
                  <NavLink className="mobile-nav-link" to="/profile" onClick={() => setMobileOpen(false)}>
                    Profile
                  </NavLink>
                  <button
                    className="mobile-nav-link mobile-nav-action"
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <NavLink className="mobile-nav-link" to="/login" onClick={() => setMobileOpen(false)}>
                  Login
                </NavLink>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
