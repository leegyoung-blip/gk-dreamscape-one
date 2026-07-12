"use client";

import Link from "next/link";
import { useState } from "react";

type DreamShopProduct = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  price: number;
  status: "available" | "coming-soon";
};

const sparkProducts: DreamShopProduct[] = [
  {
    id: "spark-local-legends-blind-box",
    name: "Spark Local Legends Blind Box",
    subtitle: "Series 01 mystery collectible",
    description:
      "One box contains one random Spark collectible from the first local legends launch series.",
    image: "/milo-world/blind-box/delivery-spark.png",
    price: 19.9,
    status: "available",
  },
];

const possiblePulls = [
  {
    name: "Delivery Spark",
    image: "/milo-world/blind-box/delivery-spark.png",
    description: "A courier-inspired Spark with a parcel pack.",
  },
  {
    name: "Hawker Spark",
    image: "/milo-world/blind-box/hawker-spark.png",
    description: "A hawker-helper Spark with a simple food tray theme.",
  },
  {
    name: "Barista Spark",
    image: "/milo-world/blind-box/barista-spark.png",
    description: "A café-inspired Spark with an apron and coffee cup.",
  },
];

export default function DreamShopPage() {
  const [message, setMessage] = useState("");

  function addBlindBoxToCart() {
    const cartItem = {
      id: `spark-blind-box-${Date.now()}`,
      productType: "milo-blind-box",
      name: "Spark Local Legends Blind Box",
      description: "One mystery Spark collectible from Series 01.",
      series: "Spark Local Legends: Series 01",
      possiblePulls: ["Delivery Spark", "Hawker Spark", "Barista Spark"],
      image: "/milo-world/blind-box/delivery-spark.png",
      price: 19.9,
      quantity: 1,
    };

    const savedCart = JSON.parse(
      localStorage.getItem("dreamscape-cart") || "[]"
    );

    localStorage.setItem(
      "dreamscape-cart",
      JSON.stringify([...savedCart, cartItem])
    );

    setMessage("Added Spark Local Legends Blind Box to cart.");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#020813",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at top, rgba(126,232,255,0.18), transparent 34%), radial-gradient(circle at 85% 18%, rgba(255,142,66,0.12), transparent 34%), linear-gradient(180deg,#041124 0%,#020813 100%)",
          pointerEvents: "none",
        }}
      />

      <section
        style={{
          position: "relative",
          zIndex: 2,
          width: "min(1180px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "28px 0 70px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/milo-world"
            style={{
              minHeight: "42px",
              padding: "0 18px",
              borderRadius: "999px",
              border: "1px solid rgba(126,232,255,0.25)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              fontSize: "14px",
              fontWeight: 700,
              backdropFilter: "blur(14px)",
            }}
          >
            ← Back to Milo’s World
          </Link>

          <Link
            href="/cart"
            style={{
              minHeight: "42px",
              padding: "0 18px",
              borderRadius: "999px",
              border: "1px solid rgba(126,232,255,0.25)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              fontSize: "14px",
              fontWeight: 700,
              backdropFilter: "blur(14px)",
            }}
          >
            🛒 Cart
          </Link>
        </header>

        <div style={{ marginTop: "70px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              color: "#7ee8ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
            }}
          >
            Milo’s World
          </p>

          <h1
            style={{
              margin: "14px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: "clamp(54px, 9vw, 104px)",
              lineHeight: 0.9,
              fontWeight: 400,
              letterSpacing: "-0.05em",
            }}
          >
            Dream Shop
          </h1>

          <p
            style={{
              maxWidth: "680px",
              margin: "24px auto 0",
              color: "rgba(255,255,255,0.64)",
              fontSize: "17px",
              lineHeight: 1.7,
            }}
          >
            Collectibles, limited drops, blind boxes, and future Dreamscape
            items from Milo’s design district.
          </p>
        </div>

        <section
          style={{
            marginTop: "58px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
            alignItems: "stretch",
          }}
        >
          {sparkProducts.map((product) => (
            <article
              key={product.id}
              style={{
                borderRadius: "30px",
                border: "1px solid rgba(126,232,255,0.18)",
                background: "rgba(255,255,255,0.055)",
                overflow: "hidden",
                boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
                backdropFilter: "blur(18px)",
              }}
            >
              <div
                style={{
                  height: "340px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "radial-gradient(circle at 50% 45%, rgba(126,232,255,0.14), rgba(255,255,255,0.04) 44%, rgba(255,255,255,0.015))",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    width: "86%",
                    height: "86%",
                    objectFit: "contain",
                    objectPosition: "center",
                    filter: "drop-shadow(0 24px 36px rgba(0,0,0,0.34))",
                  }}
                />
              </div>

              <div style={{ padding: "26px" }}>
                <p
                  style={{
                    margin: 0,
                    color: "#ffd18a",
                    fontSize: "12px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Available Now
                </p>

                <h2
                  style={{
                    margin: "12px 0 0",
                    fontSize: "34px",
                    lineHeight: 1.05,
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Spark Local Legends
                  <br />
                  Blind Box
                </h2>

                <p
                  style={{
                    margin: "14px 0 0",
                    color: "rgba(255,255,255,0.62)",
                    fontSize: "15px",
                    lineHeight: 1.6,
                  }}
                >
                  {product.description}
                </p>

                <div
                  style={{
                    marginTop: "22px",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,209,138,0.18)",
                    background: "rgba(255,209,138,0.08)",
                    padding: "18px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(255,255,255,0.46)",
                      fontSize: "12px",
                      fontWeight: 900,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    Price
                  </p>

                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "white",
                      fontSize: "42px",
                      lineHeight: 1,
                      fontWeight: 900,
                    }}
                  >
                    ${product.price.toFixed(2)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addBlindBoxToCart}
                  style={{
                    marginTop: "20px",
                    width: "100%",
                    height: "54px",
                    borderRadius: "16px",
                    border: "none",
                    background: "white",
                    color: "#061632",
                    fontSize: "15px",
                    fontWeight: 900,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}
                >
                  Add to Cart
                </button>

                {message && (
                  <p
                    style={{
                      margin: "14px 0 0",
                      color: "#7ee8ff",
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  >
                    {message}
                  </p>
                )}
              </div>
            </article>
          ))}

          <aside
            style={{
              borderRadius: "30px",
              border: "1px solid rgba(255,209,138,0.18)",
              background:
                "linear-gradient(180deg, rgba(112,57,18,0.34), rgba(4,20,48,0.72))",
              padding: "26px",
              boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
              backdropFilter: "blur(18px)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Series 01
            </p>

            <h2
              style={{
                margin: "12px 0 0",
                fontSize: "34px",
                lineHeight: 1.05,
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              Possible Pulls
            </h2>

            <p
              style={{
                margin: "14px 0 0",
                color: "rgba(255,255,255,0.62)",
                fontSize: "15px",
                lineHeight: 1.6,
              }}
            >
              Each blind box contains one random Spark from this launch set.
            </p>

            <div
              style={{
                marginTop: "24px",
                display: "grid",
                gap: "16px",
              }}
            >
              {possiblePulls.map((pull) => (
                <div
                  key={pull.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "92px 1fr",
                    gap: "14px",
                    alignItems: "center",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.055)",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      height: "86px",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={pull.image}
                      alt={pull.name}
                      style={{
                        width: "82%",
                        height: "82%",
                        objectFit: "contain",
                        objectPosition: "center",
                      }}
                    />
                  </div>

                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        lineHeight: 1.1,
                      }}
                    >
                      {pull.name}
                    </h3>

                    <p
                      style={{
                        margin: "7px 0 0",
                        color: "rgba(255,255,255,0.56)",
                        fontSize: "13px",
                        lineHeight: 1.45,
                      }}
                    >
                      {pull.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                margin: "22px 0 0",
                color: "rgba(255,255,255,0.46)",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              Disclaimer: This preview is a digital concept render. The actual
              3D printed product will not look this detailed. Small details may
              be simplified, layer lines may be visible, and colours may vary
              slightly depending on print settings and material availability.
            </p>
          </aside>
        </section>
      </section>
    </main>
  );
}