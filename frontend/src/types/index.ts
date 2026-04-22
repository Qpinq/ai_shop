export interface Product {
  id: number;
  name: string;
  price: number;
  currency: string;
  image: string;
  description: string;
  full_description: string;
  in_stock: boolean;
  category: string;
  brand: string;
  rating: number;
  reviews_count: number;
  specs: string[];
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}
