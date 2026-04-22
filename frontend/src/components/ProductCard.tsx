"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Check, Plus, Eye, ImageOff } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Star } from "lucide-react";

import { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index?: number;
  onAddToCart?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
}

export default function ProductCard({ product, index = 0, onAddToCart, onViewDetails }: ProductCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <Card className="overflow-hidden group h-full flex flex-col">
        <div 
          className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
          onClick={() => onViewDetails?.(product)}
        >
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
            </div>
          )}
          {imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <ImageOff className="w-12 h-12 mb-2 opacity-40" />
              <span className="text-xs">Нет изображения</span>
            </div>
          ) : (
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.4 }}
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
          {product.in_stock && (
            <Badge className="absolute top-3 right-3 bg-emerald-500 hover:bg-emerald-600 gap-1">
              <Check className="w-3 h-3" />
              В наличии
            </Badge>
          )}
          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="rounded-full shadow-lg">
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <CardContent className="flex-1 p-5">
          <h3 
            className="font-semibold text-base mb-2 line-clamp-1 group-hover:text-primary transition-colors cursor-pointer"
            onClick={() => onViewDetails?.(product)}
          >
            {product.name}
          </h3>
          {product.rating && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < Math.floor(product.rating!) ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {product.rating} ({product.reviews_count})
              </span>
            </div>
          )}
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {product.specs.slice(0, 3).map((spec, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {spec}
              </Badge>
            ))}
            {product.specs.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{product.specs.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>

        <Separator />

        <CardFooter className="p-5 pt-4 flex items-center justify-between gap-2">
          <div>
            <span className="text-xl font-bold tracking-tight">
              {product.price.toLocaleString("ru-RU")}
            </span>
            <span className="text-muted-foreground ml-1 text-sm">{product.currency}</span>
          </div>
          <Button 
            size="sm" 
            className="gap-1.5"
            onClick={() => onAddToCart?.(product)}
            disabled={!product.in_stock}
          >
            <Plus className="w-4 h-4" />
            <span>В корзину</span>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
