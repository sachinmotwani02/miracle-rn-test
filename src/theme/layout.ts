/** Sizes read from the 393 x 852 Figma frame, in pt. */
export const FRAME_WIDTH = 393;

export const layout = {
  screenPadding: 16,
  headerPadding: 20,
  cardMargin: 4,
  cardRadius: 24,
  cardPaddingTop: 10,
  cardPadding: 12,
  cardGap: 4,
  noteInset: 4,
  noteRadius: 20,
  avatar: 36,
  avatarSmall: 20,
  badge: 15,
  coinLogo: 36,
  buyBadge: 15,
  carouselCardWidth: 204,
  carouselCardHeight: 92,
  carouselGap: 4,
  sparklineWidth: 90,
  sparklineHeight: 32,
  depositWidth: 86,
  depositHeight: 36,
  tabGap: 16,
  nav: {
    width: 304,
    height: 64,
    padding: 8,
    pillWidth: 56,
    pillHeight: 48,
    pillRadius: 24,
    bottomGap: 3,
    /** Bar-local x of each icon centre, measured from the Figma. */
    slotCenters: [36, 92, 152, 212, 268],
  },
} as const;

/** Centre x of slot `index` inside the nav bar (bar-local coordinates). */
export function navSlotCenter(index: number): number {
  return layout.nav.slotCenters[index] ?? layout.nav.width / 2;
}

/** Left x of the active pill so that it is centred on slot `index`. */
export function navPillLeft(index: number): number {
  return navSlotCenter(index) - layout.nav.pillWidth / 2;
}
