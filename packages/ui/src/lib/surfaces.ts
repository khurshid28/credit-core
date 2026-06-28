import { cn } from './cn';

/**
 * SINGLE SOURCE OF TRUTH for surfaces (cards / panels).
 *
 * Every card-like component MUST build on `surface` instead of repeating
 * border/shadow/radius/dark-mode classes. This guarantees the shadow "sits"
 * the same everywhere and keeps the whole product visually consistent.
 *
 * Usage:
 *   import { surface, cardPad } from '../lib/surfaces';
 *   <div className={cn(surface, cardPad, className)} />
 */

/** Base card surface: radius + hairline border + card shadow + dark mode. */
export const surface =
  'rounded-2xl border border-hairline bg-surface shadow-card dark:border-white/10 dark:bg-navy-800';

/** Clickable card: same surface + a subtle hover lift. */
export const surfaceInteractive = cn(
  surface,
  'transition duration-150 hover:-translate-y-0.5 hover:shadow-soft',
);

/** Standard inner padding for cards (responsive). */
export const cardPad = 'p-5 md:p-6';

/** Tighter padding variant for dense widgets. */
export const cardPadSm = 'p-4';
