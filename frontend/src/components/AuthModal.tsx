"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, User, Mail, Lock, Phone, MapPin, Package, LogOut, Edit2, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (user: any, token: string) => void;
  onLogout: () => void;
  user: any;
  token: string | null;
  notify: (title: string, desc: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AuthModal({ isOpen, onClose, onAuth, onLogout, user, token, notify }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", address: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (user && isOpen) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
      });
      setIsEditing(false);
      fetchOrders();
    }
  }, [user, isOpen]);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOrders(data.orders);
    } catch (e) {
      console.error("Failed to fetch orders:", e);
    }
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      notify("Ошибка", "Заполните все поля");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.success) {
        onAuth(data.user, data.token);
        notify("Добро пожаловать!", `Вход выполнен как ${data.user.name}`);
        setLoginForm({ email: "", password: "" });
      } else {
        notify("Ошибка входа", data.error);
      }
    } catch (e) {
      notify("Ошибка", "Не удалось подключиться к серверу");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      notify("Ошибка", "Заполните все поля");
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      notify("Ошибка", "Пароли не совпадают");
      return;
    }
    if (registerForm.password.length < 6) {
      notify("Ошибка", "Пароль должен быть не менее 6 символов");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onAuth(data.user, data.token);
        notify("Регистрация успешна!", `Добро пожаловать, ${data.user.name}`);
        setRegisterForm({ name: "", email: "", password: "", confirmPassword: "" });
      } else {
        notify("Ошибка регистрации", data.error);
      }
    } catch (e) {
      notify("Ошибка", "Не удалось подключиться к серверу");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.success) {
        onAuth(data.user, token);
        setIsEditing(false);
        notify("Профиль обновлён", "Данные сохранены");
      }
    } catch (e) {
      notify("Ошибка", "Не удалось сохранить профиль");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
    notify("Вы вышли из аккаунта", "До встречи!");
    onClose();
  };

  const statusColors: Record<string, string> = {
    "Обработан": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "Доставляется": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    "Доставлен": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    "Возврат": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {user ? "Личный кабинет" : activeTab === "login" ? "Вход" : "Регистрация"}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {user ? (
                  <div className="space-y-6">
                    <Tabs defaultValue="profile">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="profile">Профиль</TabsTrigger>
                        <TabsTrigger value="orders">Заказы</TabsTrigger>
                        <TabsTrigger value="settings">Настройки</TabsTrigger>
                      </TabsList>

                      <TabsContent value="profile" className="space-y-4 mt-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{user.phone || "Не указан"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{user.address || "Не указан"}</span>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            <Label>Имя</Label>
                            <Input
                              value={profileForm.name}
                              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            />
                            <Label>Телефон</Label>
                            <Input
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              placeholder="+7 (999) 123-45-67"
                            />
                            <Label>Адрес</Label>
                            <Input
                              value={profileForm.address}
                              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                              placeholder="г. Москва, ул. Примерная, д. 1"
                            />
                            <div className="flex gap-2">
                              <Button onClick={handleSaveProfile} disabled={loading} className="flex-1">
                                <Check className="w-4 h-4 mr-1" /> Сохранить
                              </Button>
                              <Button variant="outline" onClick={() => setIsEditing(false)}>
                                Отмена
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                            <Edit2 className="w-4 h-4 mr-1" /> Редактировать
                          </Button>
                        )}
                      </TabsContent>

                      <TabsContent value="orders" className="mt-4">
                        {orders.length === 0 ? (
                          <div className="text-center py-8">
                            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">У вас пока нет заказов</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {orders.map((order) => (
                              <Card key={order.order_id}>
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-mono text-sm font-medium">{order.order_id}</span>
                                    <Badge className={statusColors[order.status] || "bg-gray-100 text-gray-800"}>
                                      {order.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-1">
                                    {order.items.join(", ")}
                                  </p>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{order.date}</span>
                                    <span className="font-bold">{order.total.toLocaleString("ru-RU")} ₽</span>
                                  </div>
                                  {order.estimated_delivery && order.status !== "Доставлен" && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Ожидается: {order.estimated_delivery}
                                    </p>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="settings" className="mt-4">
                        <Button variant="destructive" className="w-full" onClick={handleLogout}>
                          <LogOut className="w-4 h-4 mr-2" /> Выйти из аккаунта
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login">Вход</TabsTrigger>
                      <TabsTrigger value="register">Регистрация</TabsTrigger>
                    </TabsList>

                    <TabsContent value="login" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            className="pl-9"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Пароль</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="password"
                            className="pl-9"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            placeholder="Введите пароль"
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                          />
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleLogin} disabled={loading}>
                        {loading ? "Вход..." : "Войти"}
                      </Button>
                    </TabsContent>

                    <TabsContent value="register" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Имя</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            value={registerForm.name}
                            onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                            placeholder="Иван Иванов"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            className="pl-9"
                            value={registerForm.email}
                            onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                            placeholder="email@example.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Пароль</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="password"
                            className="pl-9"
                            value={registerForm.password}
                            onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                            placeholder="Минимум 6 символов"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Подтверждение пароля</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="password"
                            className="pl-9"
                            value={registerForm.confirmPassword}
                            onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                            placeholder="Повторите пароль"
                            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                          />
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleRegister} disabled={loading}>
                        {loading ? "Регистрация..." : "Зарегистрироваться"}
                      </Button>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
