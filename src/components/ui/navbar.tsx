import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, ShoppingCart } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCart } from "@/contexts/CartContext";
import { useShopCategories } from "@/hooks/useShopCategories";
import { fetchActiveProducts } from "@/lib/fetchProducts";
import type { Product } from "@/types/product";

const primaryLinks = [
  { title: "Home", url: "/" },
  { title: "Shop", url: "/shop" },
];

const secondaryLinks = [
  { title: "About", url: "/about" },
  { title: "Contact", url: "/contact" },
];

const navLinkClass =
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium text-brand-navy/80 transition-colors hover:bg-accent hover:text-brand-navy";

export default function Navbar() {
  const [openSearch, setOpenSearch] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isScrolled, setIsScrolled] = React.useState(false);

  const navigate = useNavigate();
  const { items, isLoading: cartLoading } = useCart();
  const { categories } = useShopCategories();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const showCartBadge = !cartLoading && cartCount > 0;

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const [searchableProducts, setSearchableProducts] = React.useState<Product[]>(
    []
  );

  React.useEffect(() => {
    let cancelled = false;

    async function loadSearchableProducts() {
      try {
        const products = await fetchActiveProducts();

        if (!cancelled) {
          setSearchableProducts(products);
        }
      } catch {
        // Quiet fail — search simply returns no results.
      }
    }

    loadSearchableProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const searchResults = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return [];

    return searchableProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term)
    );
  }, [searchTerm, searchableProducts]);

  function goToProduct(id: string) {
    setOpenSearch(false);
    setSearchTerm("");
    navigate(`/product/${id}`);
  }

  function goToCart() {
    navigate("/cart");
  }

  return (
    <section
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        isScrolled
          ? "border-border/70 bg-white/90 shadow-md backdrop-blur-lg"
          : "border-border bg-white shadow-sm"
      }`}
    >
      <div
        className={`container mx-auto max-w-6xl px-4 transition-all duration-300 ${
          isScrolled ? "py-2" : "py-4"
        }`}
      >
        {/* Desktop Navbar */}
        <nav className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <span
                className={`font-extrabold tracking-tight text-brand-navy transition-all duration-300 ${
                  isScrolled ? "text-lg" : "text-xl"
                }`}
              >
                Cosmo<span className="font-semibold"> Mobile Spares</span>
              </span>
            </Link>

            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link to="/" className={navLinkClass}>
                    Home
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link to="/shop" className={navLinkClass}>
                    Shop
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-brand-navy/80 hover:text-brand-navy data-[state=open]:text-brand-navy">
                    Categories
                  </NavigationMenuTrigger>

                  <NavigationMenuContent>
                    <ul className="grid w-[420px] grid-cols-2 gap-1 p-3">
                      {categories.map((category) => (
                        <li key={category.slug}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={`/shop?category=${category.slug}`}
                              className="flex select-none items-start gap-3 rounded-md p-3 leading-none text-brand-navy no-underline outline-none transition-colors hover:bg-accent hover:text-brand-navy"
                            >
                              <category.icon className="size-5 shrink-0" />
                              <span className="text-sm font-medium">
                                {category.title}
                              </span>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {secondaryLinks.map((link) => (
                  <NavigationMenuItem key={link.title}>
                    <Link to={link.url} className={navLinkClass}>
                      {link.title}
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search products"
              className="text-brand-navy hover:bg-accent hover:text-brand-navy"
              onClick={() => setOpenSearch(true)}
            >
              <Search className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative text-brand-navy hover:bg-accent hover:text-brand-navy"
              aria-label={`Cart, ${cartCount} item${
                cartCount === 1 ? "" : "s"
              }`}
              onClick={goToCart}
            >
              <ShoppingCart className="size-4" />

              {showCartBadge && (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </nav>

        {/* Mobile Navbar */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span
                className={`font-extrabold tracking-tight text-brand-navy transition-all duration-300 ${
                  isScrolled ? "text-base" : "text-lg"
                }`}
              >
                Cosmo<span className="font-semibold"> Mobile Spares</span>
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search products"
                className="text-brand-navy hover:bg-accent hover:text-brand-navy"
                onClick={() => setOpenSearch(true)}
              >
                <Search className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="relative text-brand-navy hover:bg-accent hover:text-brand-navy"
                aria-label={`Cart, ${cartCount} item${
                  cartCount === 1 ? "" : "s"
                }`}
                onClick={goToCart}
              >
                <ShoppingCart className="size-4" />

                {showCartBadge && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open menu"
                    className="text-brand-navy hover:bg-accent hover:text-brand-navy"
                  >
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>

                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>
                      <span className="text-base font-extrabold tracking-tight text-brand-navy">
                        Cosmo<span className="font-semibold"> Mobile Spares</span>
                      </span>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="my-6 flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                      {primaryLinks.map((link) => (
                        <Link
                          key={link.title}
                          to={link.url}
                          className="rounded-md px-2 py-2 font-semibold text-brand-navy hover:bg-accent"
                        >
                          {link.title}
                        </Link>
                      ))}
                    </div>

                    <Accordion
                      type="single"
                      collapsible
                      className="flex w-full flex-col gap-4"
                    >
                      <AccordionItem
                        value="categories"
                        className="border-b-0"
                      >
                        <AccordionTrigger className="py-0 font-semibold text-brand-navy hover:no-underline">
                          Categories
                        </AccordionTrigger>

                        <AccordionContent className="mt-2">
                          <div className="flex flex-col gap-1">
                            {categories.map((category) => (
                              <Link
                                key={category.slug}
                                to={`/shop?category=${category.slug}`}
                                className="flex select-none items-center gap-3 rounded-md p-3 leading-none text-brand-navy outline-none transition-colors hover:bg-accent"
                              >
                                <category.icon className="size-5 shrink-0" />

                                <span className="text-sm font-medium">
                                  {category.title}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="flex flex-col gap-1 border-t border-border pt-4">
                      {secondaryLinks.map((link) => (
                        <Link
                          key={link.title}
                          to={link.url}
                          className="rounded-md px-2 py-2 font-semibold text-brand-navy hover:bg-accent"
                        >
                          {link.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Search Dialog */}
      <CommandDialog open={openSearch} onOpenChange={setOpenSearch}>
        <CommandInput
          placeholder="Search products (e.g. iPhone screen, soldering iron)..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />

        <CommandList>
          {searchTerm.trim() === "" ? (
            <CommandEmpty>Start typing to search products.</CommandEmpty>
          ) : searchResults.length === 0 ? (
            <CommandEmpty>No matching products found.</CommandEmpty>
          ) : (
            <CommandGroup heading="Products">
              {searchResults.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => goToProduct(product.id)}
                >
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">
                      {product.name}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {product.category}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </section>
  );
}
