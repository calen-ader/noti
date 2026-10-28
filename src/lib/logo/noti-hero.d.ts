export type NotiHero = { svg: SVGSVGElement; replay(): void; destroy(): void };
export function mountNotiHero(
  container: HTMLElement,
  options?: { intro?: boolean; interactive?: boolean; label?: string },
): NotiHero;
