import { router, usePathname, type Href } from "expo-router";
import { PAGES } from "./pages";

// Which way the last page change went, so the stack can slide the new screen in
// from that side. Read by the character layout's screenOptions.
let lastDirection: "forward" | "back" = "forward";
export const pageAnimation = () =>
  lastDirection === "forward" ? "slide_from_right" : ("slide_from_left" as const);

export function usePageNav(id: string) {
  const pathname = usePathname();
  const found = PAGES.findIndex((p) => p.slug && pathname.endsWith(`/${p.slug}`));
  const index = found === -1 ? 0 : found;

  const goTo = (i: number) => {
    if (i < 0 || i >= PAGES.length || i === index) return;
    lastDirection = i > index ? "forward" : "back";
    const slug = PAGES[i].slug;
    // replace, not push, so switching pages doesn't build a back stack
    router.replace(`/character/${id}${slug ? `/${slug}` : ""}` as Href);
  };

  return { index, current: PAGES[index], goTo };
}
