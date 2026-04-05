/**
 * Centralized credit cost definitions.
 * Edit this file to adjust pricing across the entire platform.
 */
export const CREDIT_COSTS = {
  // === Image generation ===
  STYLE_COPY: 5,
  TEXT_EDIT: 5,
  HANDHELD_PRODUCT: 5,
  MULTI_FUSION: 10,
  VIRTUAL_TRYON: 8,
  VIRTUAL_TRYON_PLUS: 12,
  INPAINT: 5,
  IMAGE_EDIT: 5,
  IMAGE_EDIT_PRO: 10,
  /** Fallback for unknown advanced image types */
  ADVANCED_IMAGE_DEFAULT: 5,

  // === Video generation ===
  STORYBOARD_COMPOSE: 10,

  // === Digital human ===
  VOICE_CLONE: 10,
  DH_VIDEO: 15,
  /** Per-video cost for mixcut and DH batch v2 */
  MIXCUT_PER_VIDEO: 20,
} as const;
