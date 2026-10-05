/** Sizes measured from the 393 x 852 Figma frame, in pt. */
export const FRAME_WIDTH = 393;

export const layout = {
  screenPadding: 16,
  headerPadding: 20,
  cardMargin: 4,
  cardRadius: 24,
  cardPadding: 12,
  cardGap: 4,
  noteInset: 4,
  noteRadius: 16,
  avatar: 36,
  avatarSmall: 24,
  badge: 15,
  coinLogo: 36,
  buyBadge: 21,
  buyBadgeSmall: 20,
  carouselCardWidth: 204,
  carouselCardHeight: 92,
  carouselGap: 4,
  sparklineWidth: 90,
  sparklineHeight: 32,
  depositWidth: 86,
  depositHeight: 36,
  tabGap: 18,
  nav: { width: 300, height: 64, padding: 4, slots: 5, pill: 56, bottomGap: 2 },
} as const;

/** Centre x of slot `index` inside the nav bar (bar-local coordinates). */
export function navSlotCenter(
  index: number,
  width: number = layout.nav.width,
  padding: number = layout.nav.padding,
  slots: number = layout.nav.slots,
): number {
  const slotWidth = (width - padding * 2) / slots;
  return padding + slotWidth * index + slotWidth / 2;
}

/** Left x of the active pill so that it is centred on slot `index`. */
export function navPillLeft(index: number, pill: number = layout.nav.pill): number {
  return navSlotCenter(index) - pill / 2;
}
