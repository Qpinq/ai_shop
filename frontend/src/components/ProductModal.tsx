"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, ChevronLeft, ChevronRight, Star, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { Product } from "@/types";

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  products: Product[];
}

export default function ProductModal({ product, isOpen, onClose, onAddToCart, products }: ProductModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!product) return null;

  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-10 lg:inset-20 z-50 overflow-y-auto bg-background rounded-xl shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-md">
              <h2 className="text-lg font-semibold truncate pr-4">{product.name}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 md:p-6 lg:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {product.in_stock && (
                      <Badge className="absolute top-3 right-3 bg-emerald-500 gap-1">
                        <Check className="w-3 h-3" />
                        В наличии
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Badge variant="secondary" className="mb-2">{product.category}</Badge>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {product.rating} ({product.reviews_count} отзывов)
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-3xl md:text-4xl font-bold">
                      {product.price.toLocaleString("ru-RU")}
                      <span className="text-lg text-muted-foreground ml-1">{product.currency}</span>
                    </p>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    {product.full_description}
                  </p>

                  <div className="space-y-2">
                    <h3 className="font-medium">Характеристики:</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.specs.map((spec, i) => (
                        <Badge key={i} variant="outline" className="font-normal">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-3">
                    <Button
                      size="lg"
                      className="flex-1 gap-2"
                      onClick={() => onAddToCart(product)}
                      disabled={!product.in_stock}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span>В корзину</span>
                    </Button>
                  </div>
                </div>
              </div>

              {relatedProducts.length > 0 && (
                <>
                  <Separator className="my-8" />
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Похожие товары</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {relatedProducts.map((relatedProduct) => (
                        <Card
                          key={relatedProduct.id}
                          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => {
                            setCurrentImageIndex(0);
                          }}
                        >
                          <div className="aspect-square bg-muted">
                            <img
                              src={relatedProduct.image}
                              alt={relatedProduct.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <h3 className="font-medium text-sm truncate mb-1">
                              {relatedProduct.name}
                            </h3>
                            <p className="text-lg font-bold">
                              {relatedProduct.price.toLocaleString("ru-RU")} {relatedProduct.currency}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>
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
