"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Minus, Plus, Trash2, CheckCircle, User, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  onClearCart: () => void;
  onOrderPlaced?: (orderData: { name: string; phone: string; email: string; address: string }) => Promise<boolean>;
  isAuthenticated: boolean;
  onLoginClick: () => void;
}

export default function CartWidget({ isOpen, onClose, items, onUpdateQuantity, onRemove, onClearCart, onOrderPlaced, isAuthenticated, onLoginClick }: CartWidgetProps) {
  const [isCheckout, setIsCheckout] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!formData.phone || !formData.address) return;
    if (!isAuthenticated) {
      onLoginClick();
      return;
    }
    setIsSubmitting(true);
    const success = await onOrderPlaced?.(formData);
    setIsSubmitting(false);
    if (success) {
      setOrderPlaced(true);
      setOrderId(`NT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`);
    }
  };

  if (orderPlaced) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l shadow-xl z-50 flex items-center justify-center p-8"
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Заказ оформлен!</h2>
                <p className="text-muted-foreground mb-4">
                  Мы свяжемся с вами для подтверждения
                </p>
                <Badge variant="secondary" className="font-mono text-sm">
                  {orderId}
                </Badge>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  if (isCheckout) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsCheckout(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l shadow-xl z-50"
            >
              <div className="flex flex-col h-full">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Оформление заказа</h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsCheckout(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!isAuthenticated ? (
                    <div className="text-center py-8 space-y-4">
                      <User className="w-12 h-12 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Для оформления заказа необходимо войти в аккаунт</p>
                      <Button onClick={onLoginClick}>Войти</Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Телефон *</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+7 (999) 123-45-67"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Адрес доставки *</Label>
                        <Input
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="г. Москва, ул. Примерная, д. 1"
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h3 className="font-medium">Товары в заказе</h3>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                              <span className="truncate flex-1">{item.name} × {item.quantity}</span>
                              <span className="font-medium">
                                {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                              </span>
                            </div>
                          ))}
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between font-bold">
                          <span>Итого:</span>
                          <span>{total.toLocaleString("ru-RU")} ₽</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {isAuthenticated && (
                  <div className="p-4 border-t">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handlePlaceOrder}
                      disabled={!formData.phone || !formData.address || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Оформление...
                        </>
                      ) : (
                        "Подтвердить заказ"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l shadow-xl z-50"
          >
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">Корзина</h2>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">Корзина пуста</p>
                    <p className="text-sm text-muted-foreground">
                      Добавьте товары из каталога
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <Card key={item.id}>
                        <div className="p-3 flex gap-3">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{item.name}</h3>
                            <p className="text-lg font-bold mt-1">
                              {item.price.toLocaleString("ru-RU")} ₽
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 ml-auto text-destructive"
                                onClick={() => onRemove(item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <>
                  <Separator />
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Итого:</span>
                      <span className="text-2xl font-bold">{total.toLocaleString("ru-RU")} ₽</span>
                    </div>
                    <Button className="w-full" size="lg" onClick={() => setIsCheckout(true)}>
                      Оформить заказ
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
