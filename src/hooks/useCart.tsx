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
      const findProduct = cart.find(carItem => carItem.id === productId);
      

      if(findProduct){
        const stockResponse = await api.get<Stock>(`/stock/${productId}`);
        const stockData = stockResponse.data;     
        
        const isItemUnavailable = findProduct.amount + 1 > stockData.amount;

        if(isItemUnavailable){
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const updatedCart = cart.map(item => item.id === productId ? 
          {...item, amount: item.amount + 1}: item);

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        return;
      }

      const productResponse = await api.get<Omit<Product, 'amount'>>(`/products/${productId}`);
      const productData = productResponse.data;

      const cartData = {
        ...productData,
        amount: 1,
      }

      setCart((oldValue) => [...oldValue, cartData]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, cartData]));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const hasItem = cart.some(item => item.id === productId);
      if(!hasItem) {
        toast.error('Erro na remoção do produto');
        return;
      }


      const updatedCart = cart.filter(item => item.id !== productId)

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if( amount <= 0) return;

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const {amount: itemStockAmount} = stockResponse.data;

      const stockNotAvailable = amount > itemStockAmount;

      if(stockNotAvailable) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const itemExists = cart.some(item => item.id === productId);

      if(!itemExists) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const updatedCart = cart.map(item => item.id === productId ? 
        {...item, amount }: item);

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
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
