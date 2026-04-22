"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Headphones, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SupportFormProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  notify: (title: string, desc: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SupportForm({ isOpen, onClose, token, notify }: SupportFormProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");

  const handleSubmit = async () => {
    if (!message.trim()) {
      notify("Ошибка", "Опишите проблему");
      return;
    }
    if (!token) {
      notify("Требуется авторизация", "Войдите в аккаунт для обращения в поддержку");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: subject || "Обращение в поддержку",
          message,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTicketId(data.ticket.ticket_id);
        setSubmitted(true);
        notify("Обращение создано", `Номер: ${data.ticket.ticket_id}`);
      } else {
        notify("Ошибка", data.error);
      }
    } catch (e) {
      notify("Ошибка", "Не удалось отправить обращение");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubject("");
    setMessage("");
    setSubmitted(false);
    setTicketId("");
    onClose();
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
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-primary" />
                    <CardTitle>Обращение в поддержку</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleClose}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Обращение отправлено!</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Мы ответим вам в ближайшее время
                      </p>
                      <p className="font-mono text-sm bg-muted rounded px-3 py-1.5 inline-block">
                        {ticketId}
                      </p>
                    </div>
                    <Button onClick={handleClose} className="w-full">Закрыть</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Тема</Label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Проблема с заказом"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Описание проблемы *</Label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Подробно опишите вашу проблему..."
                        rows={5}
                        className="resize-none"
                      />
                    </div>
                    <Button className="w-full" onClick={handleSubmit} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Отправка...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Отправить обращение
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
