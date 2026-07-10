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
    return sum + (item.price || 19.9) * item.quantity;
  }, 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020813] px-5 py-8 text-white sm:px-8 sm:py-10">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,232,255,0.18),transparent_34%),linear-gradient(180deg,#041124_0%,#020813_100%)]" />
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-140px] right-[-120px] h-[380px] w-[380px] rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <Link
          href="/profile"
          className="inline-flex h-11 items-center rounded-full border border-cyan-200/25 bg-white/6 px-5 text-sm tracking-wide text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:scale-[1.03] hover:border-cyan-200/45"
        >
          ← Back to Profile
        </Link>

        <section className="mt-14 text-center">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.24em] text-[#7ee8ff]">
            Dreamscape One
          </p>

          <h1 className="mt-4 text-5xl font-extralight tracking-[-0.05em] text-white drop-shadow-[0_0_28px_rgba(126,232,255,0.18)] sm:text-7xl">
            Cart
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/62">
            Review your Dreamscape items before checkout.
          </p>
        </section>

        {cart.length === 0 ? (
          <section className="mt-12 rounded-[32px] border border-cyan-200/18 bg-white/[0.045] p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
            <p className="text-lg text-white/72">Your cart is empty.</p>

            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] transition hover:scale-[1.02]"
            >
              Return to World
            </Link>
          </section>
        ) : (
          <div className="mt-12 space-y-5">
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
                  className="rounded-[30px] border border-cyan-200/18 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-6"
                >
                  <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    {displayImage && (
                      <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-cyan-200/12 bg-[#061632]/75 md:w-52">
                        <img
                          src={displayImage}
                          alt={item.name || "Cart item"}
                          className="h-full w-full object-contain p-3 drop-shadow-[0_16px_28px_rgba(0,0,0,0.25)]"
                          draggable={false}
                        />
                      </div>
                    )}

                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7ee8ff]">
                        Cart Item
                      </p>

                      <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white sm:text-3xl">
                        {item.name ||
                          (isBolt
                            ? "Custom 3D Printed Bolt"
                            : "Dreamscape Product")}
                      </h2>

                      {isBolt && (
                        <div className="mt-5 grid gap-2 rounded-2xl border border-cyan-200/12 bg-[#061632]/75 p-4 text-sm text-white/72">
                          {item.antenna && <p>Antenna: {item.antenna}</p>}
                          {item.eye && <p>Eye: {item.eye}</p>}
                          {item.leg && <p>Leg: {item.leg}</p>}
                        </div>
                      )}

                      {isCustomNovaPick && (
                        <div className="mt-5 grid gap-2 rounded-2xl border border-cyan-200/12 bg-[#061632]/75 p-4 text-sm text-white/72">
                          <p>Colour: {item.colour}</p>
                          <p>Name: {item.customName}</p>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <div className="rounded-full border border-cyan-200/14 bg-white/[0.05] px-4 py-2 text-sm text-white/72">
                          Quantity:{" "}
                          <span className="font-bold text-white">
                            {item.quantity}
                          </span>
                        </div>

                        <div className="rounded-full border border-yellow-200/18 bg-yellow-200/10 px-4 py-2 text-sm text-[#ffd18a]">
                          ${((item.price || 19.9) * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      <button
                        onClick={() => removeItem(index)}
                        className="mt-5 rounded-full border border-red-300/20 bg-red-400/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-200 transition hover:bg-red-400/18"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <section className="rounded-[30px] border border-yellow-300/28 bg-[linear-gradient(180deg,rgba(112,57,18,0.42),rgba(4,20,48,0.82))] p-6 shadow-[0_0_42px_rgba(250,204,21,0.08),0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffd18a]">
                    Order Summary
                  </p>

                  <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-white">
                    Total
                  </h2>
                </div>

                <p className="text-4xl font-extrabold text-white">
                  ${total.toFixed(2)}
                </p>
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={clearCart}
                className="h-13 rounded-full border border-cyan-200/18 bg-white/[0.06] px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:scale-[1.01] hover:bg-white/[0.1]"
              >
                Clear Cart
              </button>

              <button className="h-13 rounded-full bg-white px-5 py-4 text-sm font-bold uppercase tracking-[0.12em] text-[#061632] shadow-[0_0_30px_rgba(126,232,255,0.14)] transition hover:scale-[1.01]">
                Checkout Coming Soon
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}