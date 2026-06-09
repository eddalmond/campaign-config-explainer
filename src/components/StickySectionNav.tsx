import { useEffect, useState } from 'react';

interface Section {
  id: string;
  label: string;
}

interface Props {
  sections: Section[];
  /** Optional className on the outer nav. */
  className?: string;
}

/**
 * A horizontal sticky nav bar with anchor links to each section. Uses
 * IntersectionObserver to highlight the section currently in view.
 *
 * The user said the page needed "a way to quick navigate between
 * sections" — this is the lightest-touch version: a single bar above
 * the iteration content, with scroll-spy to highlight the active
 * section as the user scrolls.
 */
export default function StickySectionNav({ sections, className }: Props) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    if (typeof window === 'undefined' || sections.length === 0) return;
    const observed = sections
      .map(s => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el != null);
    if (observed.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry that's most visible. We approximate by
        // choosing the first entry whose top is in the upper half of
        // the viewport.
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // Top margin accounts for any sticky app header. The nav
        // highlights the section when its top crosses ~30% of viewport.
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      },
    );
    for (const el of observed) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
    // Update the URL hash so back/forward and refresh work nicely.
    if (typeof history !== 'undefined') history.replaceState(null, '', `#${id}`);
  };

  return (
    <nav className={`section-nav ${className ?? ''}`} aria-label="Section navigation">
      <span className="section-nav__label">Jump to:</span>
      <ol className="section-nav__list">
        {sections.map(s => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`section-nav__link ${activeId === s.id ? 'section-nav__link--active' : ''}`}
              onClick={(e) => handleClick(e, s.id)}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
