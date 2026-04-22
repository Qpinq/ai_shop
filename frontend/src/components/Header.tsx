"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingCart, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  onProfileClick: () => void;
  user: any;
}

export default function Header({ cartCount, onCartClick, onProfileClick, user }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: "Каталог", href: "#products" },
    { label: "О нас", href: "#info" },
    { label: "Контакты", href: "#contacts" },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-40 border-b bg-background/80 backdrop-blur-md"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="text-xl font-bold tracking-tight">NovaTech</span>
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                asChild
                className="text-muted-foreground hover:text-foreground"
              >
                <a href={item.href}>{item.label}</a>
              </Button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={onProfileClick}
            >
              <User className="w-5 h-5" />
              {user && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={onCartClick}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs">
                  {cartCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t py-4"
            >
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Button
                    key={item.label}
                    variant="ghost"
                    className="justify-start"
                    asChild
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <a href={item.href}>{item.label}</a>
                  </Button>
                ))}
                <Button variant="ghost" className="justify-start gap-2" onClick={onProfileClick}>
                  <User className="w-4 h-4" />
                  <span>{user ? user.name : "Войти"}</span>
                </Button>
                <Button variant="ghost" className="justify-start gap-2" onClick={onCartClick}>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Корзина</span>
                  {cartCount > 0 && (
                    <Badge className="h-5 min-w-5 px-1 flex items-center justify-center text-xs">
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
