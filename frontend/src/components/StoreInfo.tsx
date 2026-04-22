"use client";

import { motion } from "framer-motion";
import { Truck, Shield, CreditCard, Phone, ArrowRight, CheckCircle2, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function StoreInfo() {
  const features = [
    {
      icon: Truck,
      title: "Быстрая доставка",
      desc: "Доставка по всей России от 1 дня. Бесплатно при заказе от 5 000₽",
    },
    {
      icon: Shield,
      title: "Гарантия качества",
      desc: "Гарантия 12 месяцев на все товары. Обмен при заводском браке",
    },
    {
      icon: CreditCard,
      title: "Удобная оплата",
      desc: "Карты, СБП, электронные кошельки, наличные при самовывозе",
    },
    {
      icon: Phone,
      title: "Поддержка 24/7",
      desc: "8-800-555-35-35 (бесплатно по России)",
    },
  ];

  const deliveryOptions = [
    { type: "Стандартная", time: "3-5 дней", price: "399₽" },
    { type: "Экспресс", time: "1-2 дня", price: "999₽" },
    { type: "Бесплатная", time: "3-5 дней", price: "от 5 000₽" },
  ];

  return (
    <section id="info" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge variant="secondary" className="mb-4">
            Преимущества
          </Badge>
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            Почему выбирают NovaTech
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Мы заботимся о каждом клиенте и предлагаем лучшие условия покупки
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl">Доставка</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliveryOptions.map((option, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{option.type}</p>
                        <p className="text-muted-foreground text-xs">{option.time}</p>
                      </div>
                    </div>
                    <Badge variant={option.type === "Бесплатная" ? "default" : "secondary"}>
                      {option.price}
                    </Badge>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>Доставка по всей России</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl">Возврат и гарантия</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: Clock, title: "Срок возврата", desc: "14 дней с момента получения" },
                  { icon: CheckCircle2, title: "Условия", desc: "Оригинальная упаковка, без следов использования" },
                  { icon: CreditCard, title: "Возврат средств", desc: "На карту в течение 5 рабочих дней" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-muted-foreground text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Гарантия 12 месяцев на все товары</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
