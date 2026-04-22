"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import StoreInfo from "@/components/StoreInfo";
import ProductFilters from "@/components/ProductFilters";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ChatWidget from "@/components/ChatWidget";
import CartWidget from "@/components/CartWidget";
import AuthModal from "@/components/AuthModal";

import { ToastContainer, useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Mail, Phone, Clock } from "lucide-react";

import { Product, CartItem } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const { toasts, removeToast, success, error, info } = useToast();

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProducts(data.products);
          setFilteredProducts(data.products);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch products:", err);
      })
      .finally(() => {
        setProductsLoading(false);
      });

    const savedUser = localStorage.getItem("novatech_user");
    const savedToken = localStorage.getItem("novatech_token");
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const saveAuth = (userData: any, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("novatech_user", JSON.stringify(userData));
    localStorage.setItem("novatech_token", authToken);
  };

  const clearAuth = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("novatech_user");
    localStorage.removeItem("novatech_token");
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, image: product.image }];
    });
  };

  const handleAddToCart = (product: Product) => {
    const existing = cart.find((item) => item.id === product.id);
    addToCart(product);
    if (existing) {
      success("Количество обновлено", `${product.name} — теперь ${existing.quantity + 1} шт.`);
    } else {
      success("Добавлено в корзину", `${product.name} — ${product.price.toLocaleString("ru-RU")} ₽`);
    }
  };

  const updateQuantity = (id: number, quantity: number) => {
    const item = cart.find((i) => i.id === id);
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
      if (item) {
        info("Количество изменено", `${item.name} — ${quantity} шт.`);
      }
    }
  };

  const removeFromCart = (id: number) => {
    const item = cart.find((i) => i.id === id);
    setCart((prev) => prev.filter((item) => item.id !== id));
    if (item) {
      error("Удалено из корзины", item.name);
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handlePlaceOrder = async (orderData: { name: string; phone: string; email: string; address: string }) => {
    if (!user || !token) {
      error("Требуется авторизация", "Войдите в аккаунт для оформления заказа");
      setIsCartOpen(false);
      setIsAuthOpen(true);
      return false;
    }

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart,
          phone: orderData.phone || user.phone,
          address: orderData.address || user.address,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCart([]);
        success("Заказ оформлен!", `Номер: ${data.order.order_id}`);
        return true;
      } else {
        error("Ошибка", data.error);
        return false;
      }
    } catch (e) {
      error("Ошибка", "Не удалось оформить заказ");
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Header
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
        onProfileClick={() => setIsAuthOpen(true)}
        user={user}
      />
      <CartWidget
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        onClearCart={() => {
          setCart([]);
          success("Корзина очищена");
        }}
        onOrderPlaced={handlePlaceOrder}
        isAuthenticated={!!user}
        onLoginClick={() => {
          setIsCartOpen(false);
          setIsAuthOpen(true);
        }}
      />
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuth={saveAuth}
        onLogout={clearAuth}
        user={user}
        token={token}
        notify={(title, desc) => success(title, desc)}
      />
      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={(product) => {
          addToCart(product);
          setIsModalOpen(false);
        }}
        products={products}
      />

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-muted/50 to-background py-24 md:py-32">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <Badge variant="secondary" className="mb-4">
                Новая коллекция 2026
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Добро пожаловать в{" "}
                <span className="text-primary">NovaTech</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Лучшая электроника с доставкой по всей России. Оригинальные товары с гарантией.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button size="lg" asChild className="gap-2">
                  <a href="#products">
                    Смотреть товары
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#contacts">Связаться с нами</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Products Section */}
        <section id="products" className="py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-8"
            >
              <Badge variant="secondary" className="mb-4">
                Каталог
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                Наши товары
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Только оригинальная техника от официальных поставщиков
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <ProductFilters products={products} onFilteredChange={setFilteredProducts} />
            </motion.div>

            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg">Товары не найдены</p>
                <p className="text-muted-foreground text-sm mt-2">Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    onAddToCart={addToCart}
                    onViewDetails={openProductModal}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <StoreInfo />

        {/* Contacts Section */}
        <section id="contacts" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <Badge variant="secondary" className="mb-4">
                Контакты
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                Свяжитесь с нами
              </h2>
            </motion.div>

            <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <p className="font-medium text-sm mb-1">Телефон</p>
                    <a href="tel:8-800-555-35-35" className="text-primary hover:underline text-sm">
                      8-800-555-35-35
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      (бесплатно по России)
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <p className="font-medium text-sm mb-1">Email</p>
                    <a href="mailto:support@novatech.ru" className="text-primary hover:underline text-sm">
                      support@novatech.ru
                    </a>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <p className="font-medium text-sm mb-1">Режим работы</p>
                    <p className="text-sm text-muted-foreground">
                      Пн-Вс: 9:00 - 21:00
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Separator />

      <footer className="py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2026 NovaTech. Все права защищены.</p>
          </div>
        </div>
      </footer>

      <ChatWidget
        onAddToCart={addToCart}
        onCartAction={(name) => success("Добавлено из чата", name)}
        token={token}
        onLoginClick={() => {
          setIsAuthOpen(true);
        }}
      />
    </div>
  );
}
