"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, ShoppingCart, Maximize2, Minimize2, Headphones, Search, Package, User, ArrowLeft, Trash2 } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/types";

interface Message {
  role: "user" | "assistant" | "operator";
  content: string;
  product_id?: number;
  action?: "escalate" | "return_instruction" | "order_status";
  orderData?: any;
  timestamp?: number;
}

interface ChatWidgetProps {
  onAddToCart?: (product: Product) => void;
  onCartAction?: (productName: string) => void;
  token?: string | null;
  onLoginClick?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const LS_KEY = "novatech_chat_history";

const defaultMessages: Message[] = [
  {
    role: "assistant",
    content: "Привет! 👋 Я AI-ассистент NovaTech. Готов помочь с вопросами о товарах, доставке и возврате.",
    timestamp: Date.now(),
  },
];

export default function ChatWidget({ onAddToCart, onCartAction, token, onLoginClick }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOrderSearch, setShowOrderSearch] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderResult, setOrderResult] = useState<any>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [operatorMode, setOperatorMode] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReplyCountRef = useRef(0);
  const messagesRef = useRef<Message[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  messagesRef.current = messages;

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (data.products) {
          setProducts(data.products);
        }
      })
      .catch((err) => console.error("Failed to fetch products:", err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (token) {
      loadHistoryFromServer();
    } else {
      loadHistoryFromLocalStorage();
      setIsHistoryLoading(false);
    }
  }, [token]);

  const loadHistoryFromServer = async () => {
    if (!token) return;
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.messages && data.messages.length > 0) {
        setMessages(data.messages);
        if (data.operator_mode) {
          setOperatorMode(true);
          setActiveTicketId(data.active_ticket_id);
        }
      }
      localStorage.removeItem(LS_KEY);
    } catch (e) {
      console.error("Failed to load history from server:", e);
      loadHistoryFromLocalStorage();
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const loadHistoryFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.messages && parsed.messages.length > 0) {
          setMessages(parsed.messages);
          if (parsed.operator_mode) {
            setOperatorMode(true);
            setActiveTicketId(parsed.active_ticket_id);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load history from localStorage:", e);
    }
  };

  const saveHistoryToServer = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${API_URL}/api/chat-history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: messagesRef.current }),
      });
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  }, [token]);

  const saveHistory = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (token) {
        saveHistoryToServer();
      } else {
        localStorage.setItem(LS_KEY, JSON.stringify({
          messages: messagesRef.current,
          operator_mode: operatorMode,
          active_ticket_id: activeTicketId,
        }));
      }
    }, 1000);
  }, [token, operatorMode, activeTicketId, saveHistoryToServer]);

  useEffect(() => {
    if (!isHistoryLoading && messages.length > 0) {
      saveHistory();
    }
  }, [messages, isHistoryLoading, saveHistory]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (operatorMode && activeTicketId && token) {
      setTimeout(() => {
        fetchTicketReplies();
      }, 1000);
      pollRef.current = setInterval(fetchTicketReplies, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [operatorMode, activeTicketId, token]);

  const fetchTicketReplies = useCallback(async () => {
    const ticketId = activeTicketId;
    if (!ticketId || !token) return;
    const currentCount = lastReplyCountRef.current;
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.ticket.replies) {
        const totalReplies = data.ticket.replies.length;
        if (totalReplies > currentCount) {
          const newReplies = data.ticket.replies.slice(currentCount);
          lastReplyCountRef.current = totalReplies;
          const operatorMessages: Message[] = newReplies.map((r: any) => ({
            role: "operator" as const,
            content: r.message,
            timestamp: new Date(r.created_at).getTime(),
          }));
          setMessages((prev) => [...prev, ...operatorMessages]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch replies:", e);
    }
  }, [activeTicketId, token]);

  const handleAddToCart = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (product && onAddToCart) {
      onAddToCart(product);
      if (onCartAction) {
        onCartAction(product.name);
      }
    }
  };

  const detectProductInMessage = (text: string): number | null => {
    for (const product of products) {
      if (product.name.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(product.name.toLowerCase())) {
        return product.id;
      }
    }
    const match = text.match(/(?:ID|id|айди)[:\s]*(\d+)/);
    if (match) return parseInt(match[1], 10);
    return null;
  };

  const detectAction = (text: string): "escalate" | "return_instruction" | "order_status" | null => {
    if (text.includes("ACTION: escalate")) return "escalate";
    if (text.includes("ACTION: return_instruction")) return "return_instruction";
    if (text.includes("ACTION: order_status")) return "order_status";
    return null;
  };

  const cleanMessage = (text: string): string => {
    return text.replace(/\*\*ACTION:.*?\*\*/g, "").trim();
  };

  const checkOrderStatus = async () => {
    if (!orderQuery.trim()) return;
    setOrderLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/order-status?query=${encodeURIComponent(orderQuery)}`);
      const data = await res.json();
      if (data.success) {
        setOrderResult(data.order);
      } else {
        setOrderResult(null);
        const errorMsg: Message = {
          role: "assistant",
          content: `Заказ по запросу "${orderQuery}" не найден. Проверьте номер заказа или email и попробуйте снова.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (e) {
      setOrderResult(null);
    } finally {
      setOrderLoading(false);
    }
  };

  const escalateToOperator = async (userMessage: string) => {
    if (!token) {
      const reply: Message = {
        role: "assistant",
        content: "Для общения с оператором необходимо войти в аккаунт. Пожалуйста, авторизуйтесь.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
      return;
    }

    setIsLoading(true);
    try {
      const chatHistoryForTicket = messagesRef.current
        .filter((m) => m.role !== "operator")
        .map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp }));

      const res = await fetch(`${API_URL}/api/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: "Эскалация из чата",
          message: userMessage,
          chat_history: chatHistoryForTicket,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveTicketId(data.ticket_id);
        setOperatorMode(true);
        lastReplyCountRef.current = 0;

        const reply: Message = {
          role: "assistant",
          content: "**Перевожу вас на специалиста поддержки.**\n\nОжидайте, пожалуйста. Оператор ответит вам прямо здесь.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, reply]);
      } else {
        const reply: Message = {
          role: "assistant",
          content: "Не удалось создать обращение. Попробуйте позже.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, reply]);
      }
    } catch (e) {
      const reply: Message = {
        role: "assistant",
        content: "Ошибка соединения. Проверьте подключение.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const trimmedInput = input.trim();
    setInput("");
    setIsLoading(true);

    const userMessage: Message = { role: "user", content: trimmedInput, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);

    if (operatorMode && activeTicketId && token) {
      try {
        const res = await fetch(`${API_URL}/api/tickets/${activeTicketId}/reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: trimmedInput }),
        });
        const data = await res.json();
        if (!data.success) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Не удалось отправить сообщение.", timestamp: Date.now() },
          ]);
        }
        lastReplyCountRef.current++;
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Ошибка соединения.", timestamp: Date.now() },
        ]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (/статус заказ|где.*заказ|отслеживани/i.test(trimmedInput)) {
      setShowOrderSearch(true);
      const reply: Message = {
        role: "assistant",
        content: "**Проверка статуса заказа**\n\nВведите номер заказа (например, NT-2026-001) или email, привязанный к заказу:",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
      setIsLoading(false);
      return;
    }

    const isBuyIntent = /купить|в корзину|оформить|заказать|хочу|возьми|добавь/i.test(trimmedInput);

    try {
      const currentMessages = messagesRef.current;
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, history: currentMessages }),
      });

      const data = await response.json();

      if (data.success) {
        let productId = data.product_id;
        if (!productId && isBuyIntent) {
          productId = detectProductInMessage(data.response);
        }

        const action = detectAction(data.response);
        const cleanedContent = cleanMessage(data.response);

        const assistantMessage: Message = {
          role: "assistant",
          content: cleanedContent,
          product_id: productId || undefined,
          action: action || undefined,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (action === "escalate") {
          await escalateToOperator(trimmedInput);
        }
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Извините, произошла ошибка. Попробуйте ещё раз.", timestamp: Date.now() }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка соединения. Проверьте подключение.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      "Обработан": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      "Доставляется": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      "Доставлен": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      "Возврат": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
  };

  const exitOperatorMode = () => {
    setOperatorMode(false);
    setActiveTicketId(null);
    lastReplyCountRef.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);
  };

  const clearChat = () => {
    setMessages(defaultMessages);
    setOperatorMode(false);
    setActiveTicketId(null);
    lastReplyCountRef.current = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    if (token) {
      fetch(`${API_URL}/api/chat-history/clear`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    } else {
      localStorage.removeItem(LS_KEY);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full shadow-lg h-14 w-14 p-0 relative"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={isFullscreen ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            animate={isFullscreen ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isFullscreen ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={isFullscreen ? "fixed inset-0 z-[60]" : ""}
          >
            <Card className={`${isFullscreen ? "w-full h-full rounded-none" : "w-80 sm:w-96 h-[550px]"} flex flex-col overflow-hidden shadow-xl`}>
              <div className="p-4 border-b flex items-center justify-between bg-muted/50">
                <div className="flex items-center gap-3">
                  {operatorMode ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={exitOperatorMode}>
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
                        <Headphones className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Оператор NovaTech</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Онлайн
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">NovaTech Assistant</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Онлайн
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearChat}
                    className="h-8 w-8"
                    title="Очистить чат"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="h-8 w-8"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsOpen(false);
                      if (operatorMode) exitOperatorMode();
                    }}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
                {isHistoryLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {showOrderSearch && !operatorMode && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-lg p-3 border shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Проверка статуса заказа</span>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={orderQuery}
                            onChange={(e) => setOrderQuery(e.target.value)}
                            placeholder="Номер заказа или email"
                            className="h-8 text-xs"
                            onKeyDown={(e) => e.key === "Enter" && checkOrderStatus()}
                          />
                          <Button size="sm" className="h-8 px-3" onClick={checkOrderStatus} disabled={orderLoading}>
                            {orderLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                          </Button>
                        </div>
                        {orderResult && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono">{orderResult.order_id}</span>
                              {statusBadge(orderResult.status)}
                            </div>
                            <p className="text-muted-foreground">{orderResult.items.join(", ")}</p>
                            <div className="flex justify-between">
                              <span>{orderResult.date}</span>
                              <span className="font-bold">{orderResult.total.toLocaleString("ru-RU")} ₽</span>
                            </div>
                            {orderResult.estimated_delivery && orderResult.status !== "Доставлен" && (
                              <p className="text-muted-foreground">Ожидается: {orderResult.estimated_delivery}</p>
                            )}
                          </motion.div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 h-6 text-xs"
                          onClick={() => {
                            setShowOrderSearch(false);
                            setOrderQuery("");
                            setOrderResult(null);
                          }}
                        >
                          Закрыть
                        </Button>
                      </motion.div>
                    )}

                    {messages.map((msg, index) => (
                      <motion.div
                        key={`${msg.timestamp}-${index}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.05, 0.3) }}
                        className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                      >
                        {msg.role === "operator" && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Headphones className="w-3 h-3 text-blue-500" />
                            <span className="text-xs text-muted-foreground">Оператор</span>
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : msg.role === "operator"
                              ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                              : "bg-muted"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <p className="whitespace-pre-wrap leading-relaxed m-0">{msg.content}</p>
                          ) : (
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          )}
                        </div>

                        {msg.product_id && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2"
                          >
                            <Button
                              size="sm"
                              className="gap-1.5"
                              onClick={() => handleAddToCart(msg.product_id!)}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Добавить в корзину</span>
                            </Button>
                          </motion.div>
                        )}

                        {msg.action === "escalate" && !operatorMode && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 4 }}
                            className="mt-2 flex flex-col gap-1.5"
                          >
                            {token ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1.5"
                                onClick={() => escalateToOperator(msg.content)}
                              >
                                <Headphones className="w-3.5 h-3.5" />
                                <span>Переключить на оператора</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="gap-1.5"
                                onClick={() => {
                                  if (onLoginClick) onLoginClick();
                                }}
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>Войти для общения с оператором</span>
                              </Button>
                            )}
                            {token && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => {
                                  const reply: Message = {
                                    role: "assistant",
                                    content: "Опишите вашу проблему, и я создам обращение в поддержку.",
                                    timestamp: Date.now(),
                                  };
                                  setMessages((prev) => [...prev, reply]);
                                }}
                              >
                                <Headphones className="w-3.5 h-3.5" />
                                <span>Написать в поддержку</span>
                              </Button>
                            )}
                          </motion.div>
                        )}

                        {msg.action === "return_instruction" && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => {
                                const reply: Message = {
                                  role: "assistant",
                                  content: "Для оформления возврата опишите проблему — я создам обращение.",
                                  timestamp: Date.now(),
                                };
                                setMessages((prev) => [...prev, reply]);
                              }}
                            >
                              <Headphones className="w-3.5 h-3.5" />
                              <span>Оформить возврат</span>
                            </Button>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-3.5 py-2.5 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs text-muted-foreground">
                            {operatorMode ? "Оператор печатает..." : "Печатает..."}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              <Separator />

              <div className="p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={operatorMode ? "Напишите сообщение оператору..." : "Напишите сообщение..."}
                    className="flex-1"
                    disabled={isLoading || isHistoryLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading || isHistoryLoading}
                    size="icon"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {operatorMode && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Вы общаетесь с оператором. Тикет: {activeTicketId}
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
