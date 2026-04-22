"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Headphones, MessageSquare, CheckCircle, Clock, XCircle, Send, ArrowLeft, User, Bot, ChevronDown, ChevronUp, BarChart3, Download, TrendingUp, AlertCircle, Loader2, Users, ShoppingCart, Ticket, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const OPERATOR_TOKEN = "operator_token_12345";

interface Ticket {
  ticket_id: string;
  user_id: number;
  user_name: string;
  user_email: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  created_at: string;
  replies: {
    sender: string;
    sender_role: "operator" | "user";
    message: string;
    created_at: string;
  }[];
  chat_history?: {
    role: string;
    content: string;
    timestamp?: number;
  }[];
}

export default function OperatorPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchAnalytics();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/analytics`, {
        headers: { Authorization: `Bearer ${OPERATOR_TOKEN}` },
      });
      const data = await res.json();
      if (data.success) setAnalytics(data.analytics);
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const exportTicketsCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tickets/export`, {
        headers: { Authorization: `Bearer ${OPERATOR_TOKEN}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tickets.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Failed to export tickets:", e);
    }
  };

  const exportAnalyticsCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics/export`, {
        headers: { Authorization: `Bearer ${OPERATOR_TOKEN}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "analytics.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Failed to export analytics:", e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${OPERATOR_TOKEN}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setNotifCount(data.count);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPERATOR_TOKEN}` },
      });
      fetchNotifications();
    } catch (e) {
      console.error("Failed to mark notifications read:", e);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "escalation":
        return <Headphones className="w-4 h-4 text-red-500" />;
      case "ticket":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatNotifTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Только что";
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    return formatDate(iso);
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        headers: { Authorization: `Bearer ${OPERATOR_TOKEN}` },
      });
      const data = await res.json();
      if (data.success) setTickets(data.tickets);
    } catch (e) {
      console.error("Failed to fetch tickets:", e);
    }
  };

  const fetchTicketDetail = async (ticketId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${OPERATOR_TOKEN}` },
      });
      const data = await res.json();
      if (data.success) setSelectedTicket(data.ticket);
    } catch (e) {
      console.error("Failed to fetch ticket:", e);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${selectedTicket.ticket_id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPERATOR_TOKEN}`,
        },
        body: JSON.stringify({ message: replyMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setReplyMessage("");
        fetchTicketDetail(selectedTicket.ticket_id);
        fetchTickets();
      }
    } catch (e) {
      console.error("Failed to reply:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`${API_URL}/api/tickets/${selectedTicket.ticket_id}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPERATOR_TOKEN}` },
      });
      const data = await res.json();
      if (data.success) {
        setSelectedTicket(null);
        setShowChatHistory(false);
        fetchTickets();
      }
    } catch (e) {
      console.error("Failed to close:", e);
    }
  };

  const filteredTickets = filter === "all" || filter === "analytics" ? tickets : tickets.filter((t) => t.status === filter);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      open: { label: "Открыт", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
      in_progress: { label: "В работе", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
      closed: { label: "Закрыт", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    };
    const s = map[status] || map.open;
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const openCount = tickets.filter((t) => t.status === "open").length;
  const progressCount = tickets.filter((t) => t.status === "in_progress").length;
  const closedCount = tickets.filter((t) => t.status === "closed").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <a href="/">
                <ArrowLeft className="w-5 h-5" />
              </a>
            </Button>
            <div className="flex items-center gap-2">
              <Headphones className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">Панель оператора NovaTech</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notifCount}
                  </span>
                )}
              </Button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b flex items-center justify-between">
                    <span className="font-medium text-sm">Уведомления</span>
                    {notifications.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={markAllRead}>
                        Прочитать все
                      </Button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Нет новых уведомлений
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notif, i) => (
                      <div key={i} className="p-3 border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-2">
                          {getNotifIcon(notif.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{notif.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatNotifTime(notif.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <User className="w-4 h-4" />
            <span>Оператор</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Открытые</p>
                  <p className="text-3xl font-bold text-blue-600">{openCount}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">В работе</p>
                  <p className="text-3xl font-bold text-yellow-600">{progressCount}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Закрытые</p>
                  <p className="text-3xl font-bold text-green-600">{closedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedTicket ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
                        <ArrowLeft className="w-4 h-4 mr-1" /> Назад
                      </Button>
                      <span className="font-mono text-sm text-muted-foreground">{selectedTicket.ticket_id}</span>
                      {statusBadge(selectedTicket.status)}
                    </div>
                    <CardTitle>{selectedTicket.subject}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      От: {selectedTicket.user_name} ({selectedTicket.user_email})
                    </p>
                  </div>
                  {selectedTicket.status !== "closed" && (
                    <Button variant="outline" onClick={handleClose}>
                      <XCircle className="w-4 h-4 mr-1" /> Закрыть тикет
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium text-sm">{selectedTicket.user_name}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(selectedTicket.created_at)}</span>
                    </div>
                    <p className="text-sm">{selectedTicket.message}</p>
                  </div>

                  {selectedTicket.chat_history && selectedTicket.chat_history.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors"
                        onClick={() => setShowChatHistory(!showChatHistory)}
                      >
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            История AI-чата ({selectedTicket.chat_history.length} сообщений)
                          </span>
                        </div>
                        {showChatHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {showChatHistory && (
                        <div className="max-h-64 overflow-y-auto p-3 space-y-2 bg-muted/30">
                          {selectedTicket.chat_history.map((msg, i) => (
                            <div
                              key={i}
                              className={`rounded-lg px-3 py-2 text-xs ${
                                msg.role === "user"
                                  ? "bg-primary/10 ml-4"
                                  : msg.role === "assistant"
                                  ? "bg-muted mr-4"
                                  : "bg-blue-50 dark:bg-blue-900/20 ml-4"
                              }`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                {msg.role === "assistant" && <Bot className="w-3 h-3" />}
                                {msg.role === "operator" && <Headphones className="w-3 h-3" />}
                                <span className="font-medium text-muted-foreground">
                                  {msg.role === "user" ? "Клиент" : msg.role === "assistant" ? "AI" : msg.role}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTicket.replies.map((reply, i) => (
                    <div
                      key={i}
                      className={`rounded-lg p-4 ${
                        reply.sender_role === "operator"
                          ? "bg-primary/10 ml-8"
                          : "bg-muted mr-8"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Headphones className="w-4 h-4" />
                        <span className="font-medium text-sm">{reply.sender}</span>
                        <Badge variant="outline" className="text-xs">
                          {reply.sender_role === "operator" ? "Оператор" : "Клиент"}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDate(reply.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{reply.message}</p>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="sr-only">Ответ</Label>
                    <Input
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Напишите ответ..."
                      onKeyDown={(e) => e.key === "Enter" && handleReply()}
                      disabled={selectedTicket.status === "closed"}
                    />
                  </div>
                  <Button onClick={handleReply} disabled={!replyMessage.trim() || loading || selectedTicket.status === "closed"}>
                    {loading ? (
                      <span className="flex items-center gap-1">
                        Отправка...
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1" />
                        Ответить
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">Все ({tickets.length})</TabsTrigger>
              <TabsTrigger value="open">Открытые ({openCount})</TabsTrigger>
              <TabsTrigger value="in_progress">В работе ({progressCount})</TabsTrigger>
              <TabsTrigger value="closed">Закрытые ({closedCount})</TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="w-4 h-4 mr-1" />
                Аналитика
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter}>
              {filter === "analytics" ? (
                <div className="space-y-6">
                  {analyticsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : analytics ? (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Запросы сегодня</p>
                                <p className="text-2xl font-bold">{analytics.today.total_requests}</p>
                              </div>
                              <TrendingUp className="w-8 h-8 text-blue-400" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Чат запросов</p>
                                <p className="text-2xl font-bold">{analytics.today.chat_requests}</p>
                              </div>
                              <MessageSquare className="w-8 h-8 text-green-400" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Ошибки</p>
                                <p className="text-2xl font-bold text-red-600">{analytics.today.errors}</p>
                              </div>
                              <AlertCircle className="w-8 h-8 text-red-400" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Среднее время</p>
                                <p className="text-2xl font-bold">{analytics.today.avg_response_time}с</p>
                              </div>
                              <Clock className="w-8 h-8 text-yellow-400" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Пользователей</p>
                                <p className="text-2xl font-bold">{analytics.total_users}</p>
                              </div>
                              <Users className="w-8 h-8 text-purple-400" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Заказов</p>
                                <p className="text-2xl font-bold">{analytics.total_orders}</p>
                              </div>
                              <ShoppingCart className="w-8 h-8 text-orange-400" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Тикетов</p>
                                <p className="text-2xl font-bold">{analytics.open_tickets}/{analytics.total_tickets}</p>
                              </div>
                              <Ticket className="w-8 h-8 text-cyan-400" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">Популярные вопросы</CardTitle>
                              <Button variant="outline" size="sm" onClick={exportAnalyticsCSV}>
                                <Download className="w-3 h-3 mr-1" />
                                Экспорт
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {analytics.popular_questions.length > 0 ? (
                              <div className="space-y-2">
                                {analytics.popular_questions.map((q: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <span className="text-sm truncate flex-1 mr-2">{q.question}</span>
                                    <Badge variant="secondary">{q.count}</Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">Нет данных</p>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">Общая статистика</CardTitle>
                              <Button variant="outline" size="sm" onClick={exportTicketsCSV}>
                                <Download className="w-3 h-3 mr-1" />
                                Тикеты CSV
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Всего запросов</span>
                                <span className="font-medium">{analytics.total.total_requests}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Чат запросов</span>
                                <span className="font-medium">{analytics.total.chat_requests}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Ошибок</span>
                                <span className="font-medium text-red-600">{analytics.total.errors}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Среднее время ответа</span>
                                <span className="font-medium">{analytics.total.avg_response_time}с</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Открытых тикетов</span>
                                <span className="font-medium text-blue-600">{analytics.open_tickets}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Всего тикетов</span>
                                <span className="font-medium">{analytics.total_tickets}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Последние запросы</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {analytics.recent_requests.length > 0 ? (
                              analytics.recent_requests.map((req: any, i: number) => (
                                <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted rounded text-sm">
                                  <div className="flex items-center gap-3">
                                    <Badge variant={req.status_code >= 400 ? "destructive" : "default"} className="text-xs">
                                      {req.status_code}
                                    </Badge>
                                    <span className="font-mono text-xs">{req.method} {req.endpoint}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>{req.duration.toFixed(3)}с</span>
                                    <span>{new Date(req.timestamp).toLocaleTimeString("ru-RU")}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">Нет данных</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Не удалось загрузить аналитику</p>
                  )}
                </div>
              ) : filteredTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Нет обращений</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => (
                    <motion.div
                      key={ticket.ticket_id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => fetchTicketDetail(ticket.ticket_id)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{ticket.ticket_id}</span>
                              {statusBadge(ticket.status)}
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDate(ticket.created_at)}</span>
                          </div>
                          <h3 className="font-medium mb-1">{ticket.subject}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">{ticket.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{ticket.user_name}</span>
                            <span>{ticket.user_email}</span>
                            <span>Ответов: {ticket.replies.length}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
