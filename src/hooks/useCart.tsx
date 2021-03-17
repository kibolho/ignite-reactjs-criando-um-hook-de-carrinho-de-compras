import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { CartItem, Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: CartItem[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  // useEffect(() => {
  //   localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  // }, [cart]);

  const getStock = async ({
    productId,
  }: {
    productId: number;
  }): Promise<number> => {
    const stock = await api
      .get<Stock>(`stock/${productId}`)
      .then((response) => {
        const stockAmount =
          response?.data?.id === productId ? response?.data?.amount : null;
        return stockAmount;
      })
      .catch((e) => {
        throw new Error("Erro: Estoque não encontrado");
      });
    return stock ?? 0;
  };
  
  const addProduct = async (productId: number) => {    
    try {
      const stock  = await getStock({productId});

      const [hasProduct] = cart.filter(product => productId === product.id)

      if(!hasProduct && stock > 0){
        const { data: product }  = await api.get<Product>(`/products/${productId}`);

        setCart([...cart, {...product, amount: 1}])

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify([...cart, {...product, amount: 1}])
        )

        return;
      }
      
      if(hasProduct.amount < stock){
        const updatedCard = cart.map(product => {
          if (product.id === productId) product.amount += 1;
          return product;
        })

        setCart(updatedCard)
  
        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(updatedCard)
        )

        return;
      }

      toast.error('Quantidade solicitada fora de estoque');
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const hasProduct = cart.findIndex(product => product.id === productId);

      if (hasProduct === -1){
        throw new Error();
      } else {
        const filteredProducts = cart.filter(({ id }) => productId !== id);

        setCart(filteredProducts);

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(filteredProducts)
        )
      } 
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };
  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        throw new Error("Amount deve ser positivo");
      }

      const [hasProduct] = cart.filter(product => product.id === productId);

      if(!hasProduct){
        throw new Error("Não existe esse produto no carinho");
      }

      const stock  = await getStock({productId});

      if (amount > stock) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const updatedCart = cart.map(product => {
          if (product.id === productId) product.amount = amount;
          return product;
        })

        setCart(updatedCart);

        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(updatedCart)
        )
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
