/**
 * Section previews.
 *
 * In the standalone design-system site there are no app feature sections to
 * import (those live in the parent app under @features/*, which this build has
 * zero dependency on). The catalog therefore ships primitive previews only.
 *
 * This map is intentionally empty; ComponentPage falls back to the primitive
 * PREVIEWS registry when a section is absent. Keep the export so importers of
 * SECTIONS still resolve.
 */
import { type ReactNode } from 'react';

export const SECTIONS: Record<string, () => ReactNode> = {};
