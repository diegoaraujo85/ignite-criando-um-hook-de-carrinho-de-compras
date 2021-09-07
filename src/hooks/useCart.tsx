import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find(p => p.id === productId);

      if (!product) {
        toast.error('Erro na adição do produto');
      }

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);

      const { amount:stockAmount } = stockResponse?.data;
      if (stockAmount > 1) {

        const productExists = cart.find(p => p.id === productId);
        

        let newCart;

        if (productExists) {
          const amount = productExists.amount + 1;
          if(amount > stockAmount) {
            toast.error('Produto atingiu limite de estoque');
            return;
          }
          newCart = cart.map(p =>
            p.id === productId ? { ...p, amount } : p
          )
        } else {
          const productResponse = await api.get<Product>(`/products/${productId}`);

          const { id, title, price, image } = productResponse.data;
          newCart = [...cart, { id, title, price, image, amount: 1 }]

        }
        setCart(newCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch {
      toast.error('Produto não encontrado');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(p => p.id === productId);

      if (!product) {
        toast.error('Erro na remoção do produto');
        return;
      }
      
      const newCart = cart.filter(p => p.id !== productId);

      setCart(newCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const product = cart.find(p => p.id === productId);

      if (product) {
        const stock = await api.get<Stock>(`/stock/${productId}`);

        const { amount: stockAmount } = stock.data;

        if (amount > 0 && amount <= stockAmount) {
          const newCart = cart.map(p =>
            p.id === productId ? { ...p, amount } : p
          )

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
          setCart(newCart);
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
      else {
        toast.error('Erro na alteração de quantidade do produto');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
