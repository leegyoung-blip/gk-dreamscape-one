"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CartItem = {
  id?: string;
  productType?: string;
  name?: string;
  quantity: number;
  image?: string;
  price?: number;

  antenna?: string;
  eye?: string;
  leg?: string;

  colour?: string;
  customName?: string;

  type?: string;
};

function getCartImage(item: CartItem) {
  const itemName = item.name?.toLowerCase() || "";

  const isMiloBlindBox =
    item.productType === "milo-blind-box" ||
    itemName.includes("spark local legends") ||
    itemName.includes("spark blind box");

  const isNovaBlindBox =
    item.productType === "nova-blind-box" ||
    itemName.includes("nova's blind box") ||
    itemName.includes("nova blind box");

  if (isMiloBlindBox) {
    return "/milo-world/blind-box/spark-local-legends-cover.png";
  }

  if (isNovaBlindBox) {
    return "/activities/nova-blind-box/nova-blind-box-cover.png";
  }

  return item.image;
}

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = JSON.parse(
      localStorage.getItem("dreamscape-cart") || "[]"
    );

    setCart(savedCart);
  }, []);

  function saveCart(updatedCart: CartItem[]) {
    localStorage.setItem("dreamscape-cart", JSON.stringify(updatedCart));
    setCart(updatedCart);
  }

  function clearCart() {
    localStorage.removeItem("dreamscape-cart");
    setCart([]);
  }

  function removeItem(indexToRemove: number) {
    const updatedCart = cart.filter((_, index) => index !== indexToRemove);
    saveCart(updatedCart);
  }

  const total = cart.reduce((sum, item) => {
    return sum + (item.price || 12.9) * item.quantity;
  }, 0);

  return (
    <main className="min-h-screen bg-white px-8 py-10 text-indigo-950">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/profile"
          className="rounded-full bg-white px-5 py-2 text-sm shadow-md"
        >
          ← Back to Profile
        </Link>

        <h1 className="mt-10 text-5xl font-extralight tracking-[0.16em]">
          CART
        </h1>

        {cart.length === 0 ? (
          <p className="mt-8 text-indigo-950/60">Your cart is empty.</p>
        ) : (
          <div className="mt-8 space-y-5">
            {cart.map((item, index) => {
              const isBolt =
                item.productType === "bolt" ||
                item.type === "bolt" ||
                item.antenna ||
                item.eye ||
                item.leg;

              const isCustomNovaPick =
                item.productType === "inventor-tag" ||
                item.productType === "gadget-crate";

                const displayImage = getCartImage(item);

              return (
                <div
                  key={item.id || index}
                  className="rounded-3xl border border-violet-200 bg-white p-6 shadow-[0_0_40px_rgba(167,139,250,0.25)]"
                >
                  <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    {displayImage && (
                  <div className="flex h-40 w-full items-center justify-center rounded-2xl bg-violet-50 md:w-48">
                    <img
                      src={displayImage}
                      alt={item.name || "Cart item"}
                      className="h-full w-full object-contain p-3"
                      draggable={false}
                    />
                  </div>
                )}

                    <div className="flex-1">
                      <h2 className="text-2xl font-light">
                        {item.name ||
                          (isBolt
                            ? "Custom 3D Printed Bolt"
                            : "Dreamscape Product")}
                      </h2>

                      {isBolt && (
                        <div className="mt-4 space-y-1">
                          {item.antenna && (
                            <p className="text-sm">Antenna: {item.antenna}</p>
                          )}
                          {item.eye && (
                            <p className="text-sm">Eye: {item.eye}</p>
                          )}
                          {item.leg && (
                            <p className="text-sm">Leg: {item.leg}</p>
                          )}
                        </div>
                      )}

                      {isCustomNovaPick && (
                        <div className="mt-4 space-y-1">
                          <p className="text-sm">Colour: {item.colour}</p>
                          <p className="text-sm">Name: {item.customName}</p>
                        </div>
                      )}

                      <p className="mt-3 text-sm">
                        Quantity: {item.quantity}
                      </p>

                      <p className="mt-5 text-lg font-medium">
                        ${((item.price || 19.9) * item.quantity).toFixed(2)}
                      </p>

                      <button
                        onClick={() => removeItem(index)}
                        className="mt-4 rounded-full bg-red-50 px-4 py-2 text-xs text-red-600 hover:bg-red-100"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="rounded-3xl border border-violet-200 bg-violet-50 p-6">
              <div className="flex items-center justify-between text-lg">
                <span>Total</span>
                <span className="font-semibold">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={clearCart}
              className="w-full rounded-full bg-violet-100 px-5 py-3 text-sm text-indigo-950 hover:bg-violet-200"
            >
              CLEAR CART
            </button>

            <button className="w-full rounded-full bg-indigo-950 px-5 py-3 text-sm tracking-[0.12em] text-white">
              CHECKOUT COMING SOON
            </button>
          </div>
        )}
      </div>
    </main>
  );
}