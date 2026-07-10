"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  type: string;
  image: string;
  description: string;
  status?: "available" | "coming soon";
};

type HubArea = {
  id: string;
  title: string;
  label: string;
  status: "open" | "coming soon" | "locked";
  positionClass: string;
  items: Product[];
};

type BlindBoxPreview = {
  id: string;
  name: string;
  theme: string;
  image: string;
  description: string;
};

type TagColour = "blue" | "green" | "orange";

type NovaColour = "blue" | "purple";
type NovaPose = "inventor" | "action";
type NovaWeapon = "energy-wrench" | "spark-staff";
type PurchaseTier = "standard" | "premium";

const TAG_COLOURS: {
  id: TagColour;
  name: string;
  label: string;
  image: string;
  className: string;
  previewClassName: string;
}[] = [
  {
    id: "blue",
    name: "Inventor Blue",
    label: "Nova's original colourway",
    image: "/store/nova-picks/inventor-tag-blue.png",
    className: "from-cyan-300 to-blue-600",
    previewClassName:
      "h-[430px] scale-100 translate-x-[-5px] translate-y-[-5px]",
  },
  {
    id: "green",
    name: "Explorer Green",
    label: "Fresh explorer colourway",
    image: "/store/nova-picks/inventor-tag-green.png",
    className: "from-lime-300 to-green-700",
    previewClassName:
      "h-[430px] scale-145 translate-x-[13px] translate-y-[0px]",
  },
  {
    id: "orange",
    name: "Creator Orange",
    label: "Bold creator colourway",
    image: "/store/nova-picks/inventor-tag-orange.png",
    className: "from-orange-300 to-orange-700",
    previewClassName:
      "h-[430px] scale-120 translate-x-[-5px] translate-y-[0px]",
  },
];

const GADGET_CRATE_COLOURS: {
  id: TagColour;
  name: string;
  label: string;
  image: string;
  className: string;
  previewClassName: string;
}[] = [
  {
    id: "blue",
    name: "Inventor Blue",
    label: "Nova's original colourway",
    image: "/store/nova-picks/gadget-crate-blue.png",
    className: "from-cyan-300 to-blue-600",
    previewClassName: "h-[430px] scale-100 translate-x-0 translate-y-0",
  },
  {
    id: "green",
    name: "Explorer Green",
    label: "Fresh explorer colourway",
    image: "/store/nova-picks/gadget-crate-green.png",
    className: "from-lime-300 to-green-700",
    previewClassName: "h-[430px] scale-95 translate-x-0 translate-y-0",
  },
  {
    id: "orange",
    name: "Creator Orange",
    label: "Bold creator colourway",
    image: "/store/nova-picks/gadget-crate-orange.png",
    className: "from-orange-300 to-orange-700",
    previewClassName: "h-[430px] scale-100 translate-x-0 translate-y-0",
  },
];

const NOVA_COLOURS: {
  id: NovaColour;
  name: string;
  label: string;
  className: string;
}[] = [
  {
    id: "blue",
    name: "Nova Blue",
    label: "Classic blue tech colourway.",
    className: "from-cyan-300 to-blue-700",
  },
  {
    id: "purple",
    name: "Nova Purple",
    label: "Signature inventor purple colourway.",
    className: "from-violet-300 to-purple-800",
  },
];

const NOVA_POSES: {
  id: NovaPose;
  name: string;
  label: string;
}[] = [
  {
    id: "inventor",
    name: "Inventor Pose",
    label: "Confident standing pose with inventor energy.",
  },
  {
    id: "action",
    name: "Action Pose",
    label: "Dynamic motion pose ready for adventure.",
  },
];

const NOVA_WEAPONS: {
  id: NovaWeapon;
  name: string;
  label: string;
}[] = [
  {
    id: "energy-wrench",
    name: "Energy Wrench",
    label: "Nova's main invention tool.",
  },
  {
    id: "spark-staff",
    name: "Spark Staff",
    label: "A glowing staff powered by Dreamscape energy.",
  },
];

const NOVA_PREVIEW_IMAGES: Record<
  NovaColour,
  Record<NovaPose, Record<NovaWeapon, string>>
> = {
  blue: {
    inventor: {
      "energy-wrench":
        "/activities/machine-zone/nova-previews/nova-blue-inventor-energy-wrench.png",
      "spark-staff":
        "/activities/machine-zone/nova-previews/nova-blue-inventor-spark-staff.png",
    },
    action: {
      "energy-wrench":
        "/activities/machine-zone/nova-previews/nova-blue-action-energy-wrench.png",
      "spark-staff":
        "/activities/machine-zone/nova-previews/nova-blue-action-spark-staff.png",
    },
  },

  purple: {
    inventor: {
      "energy-wrench":
        "/activities/machine-zone/nova-previews/nova-purple-inventor-energy-wrench.png",
      "spark-staff":
        "/activities/machine-zone/nova-previews/nova-purple-inventor-spark-staff.png",
    },
    action: {
      "energy-wrench":
        "/activities/machine-zone/nova-previews/nova-purple-action-energy-wrench.png",
      "spark-staff":
        "/activities/machine-zone/nova-previews/nova-purple-action-spark-staff.png",
    },
  },
};

const PURCHASE_OPTIONS: {
  id: PurchaseTier;
  name: string;
  price: number;
  label: string;
  colourCount: string;
  description: string;
}[] = [
  {
    id: "standard",
    name: "Standard Version",
    price: 19.9,
    label: "Less detailed · 2-colour print",
    colourCount: "2 colours",
    description:
      "A simplified 8cm Nova figurine with clean colour blocking and reduced fine details.",
  },
  {
    id: "premium",
    name: "Premium Version",
    price: 29.9,
    label: "More detailed · 4-colour print",
    colourCount: "Up to 4 colours",
    description:
      "A more detailed 8cm Nova figurine with stronger colour separation and a more premium finish.",
  },
];

const NOVA_BLIND_BOX_PREVIEWS: BlindBoxPreview[] = [
  {
    id: "delivery-bolt",
    name: "Delivery Bolt",
    theme: "Singapore Delivery",
    image: "/activities/nova-blind-box/delivery-bolt.png",
    description:
      "A Singapore delivery-inspired Bolt with a simple green-and-white colour scheme and delivery pack.",
  },
  {
    id: "hawker-bolt",
    name: "Hawker Bolt",
    theme: "Singapore Hawker",
    image: "/activities/nova-blind-box/hawker-bolt.png",
    description:
      "A hawker-inspired Bolt serving local food with a bright orange apron and tray.",
  },
  {
    id: "barista-bolt",
    name: "Barista Bolt",
    theme: "Singapore Café",
    image: "/activities/nova-blind-box/barista-bolt.png",
    description:
      "A café-inspired Bolt with warm coffee colours, apron details, and a cup tray.",
  },
];

const HUB_AREAS: HubArea[] = [
  {
    id: "prototype-lab",
    title: "Prototype Lab",
    label: "Future inventions in development.",
    status: "locked",
    positionClass: "hotspotPrototype",
    items: [
      {
        id: "skyforge-hangar",
        name: "Skyforge Hangar",
        type: "Future Expansion",
        image: "",
        description: "Unlock future vehicle-building activities.",
        status: "coming soon",
      },
    ],
  },
  {
    id: "parts-supplies",
    title: "Dreamscape Modular System",
    label: "Build your own Dreamscape structures.",
    status: "open",
    positionClass: "hotspotParts",
    items: [
      {
        id: "starter-build-kit",
        name: "Dreamscape Starter Build Kit",
        type: "Modular Building System",
        image: "",
        description:
          "A modular block-style kit for building Dreamscape rooms, towers, paths, and display structures.",
        status: "coming soon",
      },
      {
        id: "connector-pack",
        name: "Connector Pack",
        type: "Modular Expansion",
        image: "",
        description:
          "Special Dreamscape connectors that allow students to expand and combine different build modules.",
        status: "coming soon",
      },
      {
        id: "world-detail-pack",
        name: "World Detail Pack",
        type: "Modular Decoration",
        image: "",
        description:
          "Add signs, crystals, small machines, plants, lights, and themed decorations to the build system.",
        status: "coming soon",
      },
    ],
  },
  {
    id: "novas-picks",
    title: "Nova's Picks",
    label: "Nova's favourite discoveries.",
    status: "open",
    positionClass: "hotspotPicks",
    items: [
      {
        id: "inventor-tag",
        name: "Inventor Tag",
        type: "Customisable Product",
        image: "/store/nova-picks/inventor-tag-blue.png",
        description: "Create your own Nova-style inventor name tag.",
        status: "available",
      },
      {
        id: "gadget-crate",
        name: "Gadget Crate",
        type: "Customisable Product",
        image: "/store/nova-picks/gadget-crate-blue.png",
        description: "Choose your own Nova-style gadget storage crate.",
        status: "available",
      },
    ],
  },
  {
    id: "exclusive",
    title: "Nova's Blind Box",
    label: "Collect Singapore-inspired Bolt variants.",
    status: "open",
    positionClass: "hotspotExclusive",
    items: [
      {
        id: "nova-blind-box",
        name: "Nova's Blind Box",
        type: "Bolt Launch Series",
        image: "/activities/nova-blind-box/delivery-bolt.png",
        description:
          "A blind box featuring one random Singapore-inspired Bolt variant.",
        status: "available",
      },
    ],
  },
  {
    id: "machine-zone",
    title: "Machine Zone",
    label: "Customise your own Nova figurine.",
    status: "open",
    positionClass: "hotspotMachine",
    items: [
      {
        id: "custom-nova-figurine",
        name: "Custom Nova Figurine",
        type: "Premium Custom Product",
        image: "/nova/nova-character.png",
        description: "Choose Nova's colour, pose, and weapon.",
        status: "available",
      },
    ],
  },
];

export default function InventorHubPage() {
  const router = useRouter();

  const [selectedArea, setSelectedArea] = useState<HubArea | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [inventorTagStep, setInventorTagStep] = useState<1 | 2>(1);
  const [selectedTagColour, setSelectedTagColour] =
    useState<TagColour>("blue");
  const [inventorName, setInventorName] = useState("");

  const [novaColour, setNovaColour] = useState<NovaColour>("purple");
  const [novaPose, setNovaPose] = useState<NovaPose>("inventor");
  const [novaWeapon, setNovaWeapon] = useState<NovaWeapon>("energy-wrench");

  const [machineStep, setMachineStep] = useState<1 | 2>(1);
  const [selectedPurchaseTier, setSelectedPurchaseTier] =
    useState<PurchaseTier>("standard");

  const currentOptions =
    selectedProduct?.id === "gadget-crate"
      ? GADGET_CRATE_COLOURS
      : TAG_COLOURS;

  const currentTag =
    currentOptions.find((tag) => tag.id === selectedTagColour) ??
    currentOptions[0];

  const selectedNovaColour =
    NOVA_COLOURS.find((item) => item.id === novaColour) ?? NOVA_COLOURS[0];

  const selectedNovaPose =
    NOVA_POSES.find((item) => item.id === novaPose) ?? NOVA_POSES[0];

  const selectedNovaWeapon =
    NOVA_WEAPONS.find((item) => item.id === novaWeapon) ?? NOVA_WEAPONS[0];

  const selectedPurchaseOption =
    PURCHASE_OPTIONS.find((item) => item.id === selectedPurchaseTier) ??
    PURCHASE_OPTIONS[0];

  const currentNovaPreviewImage =
    NOVA_PREVIEW_IMAGES[novaColour][novaPose][novaWeapon];

  function openArea(area: HubArea) {
    setSelectedArea(area);

    if (area.id === "machine-zone") {
      setMachineStep(1);
      setSelectedPurchaseTier("standard");
    }
  }

  function openProduct(product: Product) {
    if (product.id === "inventor-tag" || product.id === "gadget-crate") {
      setSelectedProduct(product);
      setInventorTagStep(1);
      setSelectedTagColour("blue");
      setInventorName("");
    }
  }

  function closeProduct() {
    setSelectedProduct(null);
    setInventorTagStep(1);
    setSelectedTagColour("blue");
    setInventorName("");
  }

  function closeArea() {
    setSelectedArea(null);
    setMachineStep(1);
    setSelectedPurchaseTier("standard");
  }

  function addCustomProductToCart() {
    if (!selectedProduct) return;

    if (!inventorName.trim()) {
      alert("Please enter a name first.");
      return;
    }

    const cartItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      productType: selectedProduct.id,
      name: selectedProduct.name,
      colour: currentTag.name,
      customName: inventorName.trim().toUpperCase(),
      image: currentTag.image,
      quantity: 1,
      price: selectedProduct.id === "gadget-crate" ? 16.9 : 12.9,
    };

    const existingCart = JSON.parse(
      localStorage.getItem("dreamscape-cart") || "[]"
    );

    localStorage.setItem(
      "dreamscape-cart",
      JSON.stringify([...existingCart, cartItem])
    );

    alert(`${selectedProduct.name} added to cart!`);
    closeProduct();
  }

  function addCustomNovaToCart() {
    const cartItem = {
      id: `custom-nova-${Date.now()}`,
      productType: "custom-nova-figurine",
      name: "Custom Nova Figurine",
      colour: selectedNovaColour.name,
      pose: selectedNovaPose.name,
      weapon: selectedNovaWeapon.name,
      version: selectedPurchaseOption.name,
      colourCount: selectedPurchaseOption.colourCount,
      dimensions: "Approx. 8cm height",
      material: "3D printed PLA",
      description:
        "Custom Nova figurine based on selected colour, pose, and weapon. Final 3D printed product will be simplified compared to the digital preview.",
      image: currentNovaPreviewImage,
      quantity: 1,
      price: selectedPurchaseOption.price,
    };

    const existingCart = JSON.parse(
      localStorage.getItem("dreamscape-cart") || "[]"
    );

    localStorage.setItem(
      "dreamscape-cart",
      JSON.stringify([...existingCart, cartItem])
    );

    alert(`${selectedPurchaseOption.name} added to cart!`);
    closeArea();
  }

  function addNovaBlindBoxToCart() {
    const cartItem = {
      id: `nova-blind-box-${Date.now()}`,
      productType: "nova-blind-box",
      name: "Nova's Blind Box",
      series: "Bolt Launch Series",
      description:
        "One random Singapore-inspired Bolt variant from Nova's Blind Box launch series.",
      possibleVariants: NOVA_BLIND_BOX_PREVIEWS.map((item) => item.name),
      image: "/activities/nova-blind-box/delivery-bolt.png",
      quantity: 1,
      price: 17.9,
      dimensions: "Approx. 8cm height",
      material: "3D printed PLA",
      disclaimer:
        "Blind box variant is random. Actual 3D printed product will not look as detailed as the digital preview.",
    };

    const existingCart = JSON.parse(
      localStorage.getItem("dreamscape-cart") || "[]"
    );

    localStorage.setItem(
      "dreamscape-cart",
      JSON.stringify([...existingCart, cartItem])
    );

    alert("Nova's Blind Box added to cart!");
    closeArea();
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#050816]">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/activities/inventor hub/inventor-hub-bg.png"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source
          src="/activities/inventor hub/inventor-hub-bg-loop.mp4"
          type="video/mp4"
        />
      </video>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/45" />

      <button
        onClick={() => router.push("/inventor")}
        className="absolute left-6 top-6 z-20 rounded-full border border-cyan-300/60 bg-slate-950/60 px-5 py-3 text-sm font-bold tracking-[0.12em] text-cyan-50 shadow-[0_0_24px_rgba(0,220,255,0.35)] backdrop-blur-md hover:bg-cyan-400/20"
      >
        ← Exit Inventor Hub
      </button>

      <button
        onClick={() => router.push("/cart")}
        className="absolute right-6 top-6 z-20 flex items-center gap-2 rounded-full border border-cyan-300/60 bg-slate-950/60 px-5 py-3 text-sm font-bold tracking-[0.12em] text-cyan-50 shadow-[0_0_24px_rgba(0,220,255,0.35)] backdrop-blur-md hover:bg-cyan-400/20"
      >
        <span>🛒</span>
        Cart
      </button>

      {HUB_AREAS.map((area) => (
        <button
          key={area.id}
          onClick={() => openArea(area)}
          className={`hubHotspot ${area.positionClass}`}
          aria-label={area.title}
        >
          <span className="hotspotGlow" />
          <span className="hotspotLabel">
            <strong>{area.title}</strong>
            <small>{area.label}</small>
          </span>
        </button>
      ))}

      {selectedArea &&
        selectedArea.id !== "machine-zone" &&
        selectedArea.id !== "exclusive" && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
            onClick={closeArea}
          >
            <section
              className="relative max-h-[86vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-cyan-200/50 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-8 text-white shadow-[0_0_45px_rgba(0,220,255,0.3)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={closeArea}
                className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
              >
                ×
              </button>

              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                Nova's Inventor Hub
              </p>

              <h1 className="mt-2 text-4xl font-black md:text-6xl">
                {selectedArea.title}
              </h1>

              <p className="mt-3 text-lg text-cyan-50/85">
                {selectedArea.label}
              </p>

              <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {selectedArea.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openProduct(item)}
                    disabled={item.status !== "available"}
                    className={`rounded-2xl border border-white/10 bg-white/10 p-5 text-left transition ${
                      item.status === "available"
                        ? "cursor-pointer hover:-translate-y-1 hover:bg-white/20"
                        : "cursor-not-allowed opacity-70"
                    }`}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-36 w-full rounded-xl object-contain"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center rounded-xl bg-slate-950/50 text-4xl">
                        ⚡
                      </div>
                    )}

                    <p className="mt-3 text-xs font-bold uppercase tracking-wider text-cyan-300">
                      {item.type}
                    </p>

                    <h3 className="mt-1 text-lg font-black">{item.name}</h3>

                    <p className="mt-2 text-sm text-slate-200/80">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

      {selectedArea?.id === "exclusive" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          onClick={closeArea}
        >
          <section
            className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-cyan-200/50 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-8 text-white shadow-[0_0_55px_rgba(0,220,255,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeArea}
              className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
            >
              ×
            </button>

            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
              Nova's Blind Box
            </p>

            <h1 className="mt-2 text-4xl font-black md:text-6xl">
              Bolt Launch Series
            </h1>

            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-cyan-50/85">
              Collect one random Singapore-inspired Bolt variant from Nova's
              launch blind box series.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
              {NOVA_BLIND_BOX_PREVIEWS.map((preview) => (
                <div
                  key={preview.id}
                  className="rounded-[24px] border border-white/10 bg-white/10 p-5"
                >
                  <div className="flex h-[330px] items-center justify-center rounded-[18px] bg-slate-950/45">
                    <img
                      src={preview.image}
                      alt={preview.name}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  </div>

                  <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                    {preview.theme}
                  </p>

                  <h3 className="mt-1 text-2xl font-black">{preview.name}</h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-200/75">
                    {preview.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 text-sm leading-relaxed text-slate-200/80">
                <p className="text-lg font-black text-white">
                  Product Description
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-5">
                  <li>Includes 1 random Bolt variant from the launch series.</li>
                  <li>Possible variants: Delivery Bolt, Hawker Bolt, or Barista Bolt.</li>
                  <li>Approximate size: 8cm height.</li>
                  <li>Material: 3D printed PLA.</li>
                  <li>Designed as a collectible display figurine.</li>
                  <li>Price: $17.90 per blind box.</li>
                </ul>

                <p className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-xs leading-relaxed text-amber-100/90">
                  Disclaimer: Blind box variant is random. The actual 3D printed
                  product will not look as detailed as the digital preview.
                  Small details may be simplified, layer lines may be visible,
                  and colours may vary slightly depending on print settings and
                  material availability.
                </p>
              </div>

              <div className="rounded-[24px] border border-cyan-300/40 bg-cyan-300/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                  Nova's Blind Box
                </p>

                <h3 className="mt-2 text-3xl font-black">$17.90</h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-200/75">
                  1 random 8cm Bolt figurine from the Singapore-inspired launch
                  series.
                </p>

                <button
                  onClick={addNovaBlindBoxToCart}
                  className="mt-6 w-full rounded-full bg-cyan-300 px-6 py-4 text-lg font-black text-slate-950 hover:bg-cyan-200"
                >
                  Add Blind Box to Cart
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {selectedArea?.id === "machine-zone" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
          onClick={closeArea}
        >
          <section
            className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-cyan-200/50 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 p-8 text-white shadow-[0_0_55px_rgba(0,220,255,0.35)]"
            style={{
              display: "grid",
              gridTemplateColumns: "0.95fr 1.05fr",
              gap: "24px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeArea}
              className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
            >
              ×
            </button>

            <div className="rounded-[26px] border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                Machine Zone Preview
              </p>

              <h1 className="mt-2 text-4xl font-black">Custom Nova</h1>

              <div className="mt-6 flex min-h-[520px] items-center justify-center rounded-[22px] border border-cyan-200/20 bg-slate-950/55">
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[22px]">
                  <div
                    className={`absolute inset-8 rounded-full bg-gradient-to-br ${selectedNovaColour.className} opacity-20 blur-3xl`}
                  />

                  <img
                    src={currentNovaPreviewImage}
                    alt="Custom Nova Preview"
                    className="relative z-10 max-h-[520px] w-full object-contain drop-shadow-[0_0_35px_rgba(0,220,255,0.35)]"
                    draggable={false}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                  Current Build
                </p>

                <p className="mt-2 text-lg font-black">
                  {selectedNovaColour.name} · {selectedNovaPose.name}
                </p>

                <p className="mt-1 text-sm text-slate-200/75">
                  Equipped with {selectedNovaWeapon.name}
                </p>
              </div>

              <p className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-xs leading-relaxed text-amber-100/90">
                Disclaimer: This preview is a digital concept render. The actual
                3D printed product will not look this detailed. Small details may
                be simplified, layer lines may be visible, and colours may vary
                slightly depending on print settings and material availability.
              </p>
            </div>

            <div className="rounded-[26px] border border-white/10 bg-white/10 p-5">
              {machineStep === 1 && (
                <>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                    Step 1
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    Design your Nova figurine
                  </h2>

                  <p className="mt-2 text-sm text-slate-200/80">
                    Choose Nova's colour, pose, and weapon. Your preview will
                    update on the left.
                  </p>

                  <OptionGroup title="Nova Colour">
                    {NOVA_COLOURS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setNovaColour(option.id)}
                        className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                          novaColour === option.id
                            ? "border-cyan-300 bg-cyan-300/15"
                            : "border-white/10 bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        <span
                          className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${option.className}`}
                        />

                        <span>
                          <span className="block text-lg font-black">
                            {option.name}
                          </span>
                          <span className="mt-1 block text-sm text-slate-200/70">
                            {option.label}
                          </span>
                        </span>
                      </button>
                    ))}
                  </OptionGroup>

                  <OptionGroup title="Pose">
                    {NOVA_POSES.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setNovaPose(option.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          novaPose === option.id
                            ? "border-cyan-300 bg-cyan-300/15"
                            : "border-white/10 bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        <span className="block text-lg font-black">
                          {option.name}
                        </span>
                        <span className="mt-1 block text-sm text-slate-200/70">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </OptionGroup>

                  <OptionGroup title="Weapon">
                    {NOVA_WEAPONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setNovaWeapon(option.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          novaWeapon === option.id
                            ? "border-cyan-300 bg-cyan-300/15"
                            : "border-white/10 bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        <span className="block text-lg font-black">
                          {option.name}
                        </span>
                        <span className="mt-1 block text-sm text-slate-200/70">
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </OptionGroup>

                  <button
                    onClick={() => setMachineStep(2)}
                    className="mt-6 w-full rounded-full bg-cyan-300 px-6 py-4 text-lg font-black text-slate-950 hover:bg-cyan-200"
                  >
                    Continue to Purchase Options
                  </button>
                </>
              )}

              {machineStep === 2 && (
                <>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
                    Step 2
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    Choose purchase option
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-slate-200/80">
                    Custom Nova Figurine · Approx. 8cm height · 3D printed PLA ·
                    Display collectible. Final print quality depends on selected
                    version.
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-4">
                    {PURCHASE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedPurchaseTier(option.id)}
                        className={`rounded-2xl border p-5 text-left transition ${
                          selectedPurchaseTier === option.id
                            ? "border-cyan-300 bg-cyan-300/15"
                            : "border-white/10 bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xl font-black">{option.name}</p>

                            <p className="mt-1 text-sm text-cyan-200">
                              {option.label}
                            </p>
                          </div>

                          <p className="text-2xl font-black text-cyan-300">
                            ${option.price.toFixed(2)}
                          </p>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-slate-200/75">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm leading-relaxed text-slate-200/80">
                    <p className="font-bold text-white">Product Description</p>

                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>Custom Nova figurine based on selected preview.</li>
                      <li>Approximate height: 8cm.</li>
                      <li>Material: 3D printed PLA.</li>
                      <li>Standard version: simplified 2-colour print.</li>
                      <li>
                        Premium version: more detailed, up to 4-colour print.
                      </li>
                      <li>Made as a display collectible, not a rough-play toy.</li>
                    </ul>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => setMachineStep(1)}
                      className="w-1/2 rounded-full border border-white/20 bg-white/10 px-6 py-4 text-lg font-black text-white hover:bg-white/20"
                    >
                      Back
                    </button>

                    <button
                      onClick={addCustomNovaToCart}
                      className="w-1/2 rounded-full bg-cyan-300 px-6 py-4 text-lg font-black text-slate-950 hover:bg-cyan-200"
                    >
                      Add to Cart · ${selectedPurchaseOption.price.toFixed(2)}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {(selectedProduct?.id === "inventor-tag" ||
        selectedProduct?.id === "gadget-crate") && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md"
          onClick={closeProduct}
        >
          <section
            className="relative max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-cyan-200/50 bg-gradient-to-br from-slate-950 via-blue-950 to-purple-950 p-8 text-white shadow-[0_0_55px_rgba(0,220,255,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={closeProduct}
              className="absolute right-5 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
            >
              ×
            </button>

            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">
              Nova's Picks
            </p>

            <h1 className="mt-2 text-4xl font-black md:text-6xl">
              {selectedProduct.name}
            </h1>

            <p className="mt-3 text-lg text-cyan-50/85">
              {selectedProduct.description}
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
              <div className="rounded-[26px] border border-white/10 bg-white/10 p-5">
                <p className="mb-4 text-sm font-black uppercase tracking-wider text-cyan-300">
                  Preview
                </p>

                <img
                  src={currentTag.image}
                  alt={`${currentTag.name} Preview`}
                  className={`${currentTag.previewClassName} w-full object-contain transition-all duration-300`}
                  draggable={false}
                />
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/10 p-5">
                {inventorTagStep === 1 && (
                  <>
                    <p className="text-sm font-black uppercase tracking-wider text-cyan-300">
                      Step 1
                    </p>

                    <h2 className="mt-2 text-3xl font-black">
                      Choose Your Colour
                    </h2>

                    <p className="mt-2 text-sm text-slate-200/80">
                      Select the colour theme for your {selectedProduct.name}.
                    </p>

                    <div className="mt-6 grid grid-cols-1 gap-4">
                      {currentOptions.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => setSelectedTagColour(tag.id)}
                          className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                            selectedTagColour === tag.id
                              ? "border-cyan-300 bg-cyan-300/15"
                              : "border-white/10 bg-white/10 hover:bg-white/20"
                          }`}
                        >
                          <span
                            className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${tag.className} shadow-lg`}
                          />

                          <span>
                            <span className="block text-xl font-black">
                              {tag.name}
                            </span>
                            <span className="mt-1 block text-sm text-slate-200/75">
                              {tag.label}
                            </span>
                          </span>

                          {selectedTagColour === tag.id && (
                            <span className="ml-auto rounded-full bg-cyan-300 px-3 py-1 text-xs font-black text-slate-950">
                              Selected
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setInventorTagStep(2)}
                      className="mt-6 w-full rounded-full bg-cyan-300 px-6 py-4 text-lg font-black text-slate-950 hover:bg-cyan-200"
                    >
                      Continue
                    </button>
                  </>
                )}

                {inventorTagStep === 2 && (
                  <>
                    <p className="text-sm font-black uppercase tracking-wider text-cyan-300">
                      Step 2
                    </p>

                    <h2 className="mt-2 text-3xl font-black">
                      {selectedProduct.id === "inventor-tag"
                        ? "Enter Your Name"
                        : "Name Your Crate"}
                    </h2>

                    <input
                      value={inventorName}
                      onChange={(event) =>
                        setInventorName(event.target.value.toUpperCase())
                      }
                      maxLength={12}
                      placeholder="Your inventor name"
                      className="mt-6 w-full rounded-2xl border border-cyan-200/30 bg-slate-950/70 px-5 py-4 text-xl font-black uppercase text-white outline-none placeholder:text-white/30 focus:border-cyan-300"
                    />

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => setInventorTagStep(1)}
                        className="w-1/2 rounded-full border border-white/20 bg-white/10 px-6 py-4 text-lg font-black text-white hover:bg-white/20"
                      >
                        Back
                      </button>

                      <button
                        onClick={addCustomProductToCart}
                        className="w-1/2 rounded-full bg-cyan-300 px-6 py-4 text-lg font-black text-slate-950 hover:bg-cyan-200"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        .hubHotspot {
          position: absolute;
          z-index: 10;
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .hotspotGlow {
          display: none;
        }

        .hotspotLabel {
          position: absolute;
          left: 50%;
          bottom: 100%;
          min-width: 230px;
          transform: translateX(-50%) translateY(-12px);
          border-radius: 16px;
          border: 1px solid rgba(125, 247, 255, 0.75);
          background: rgba(4, 12, 32, 0.9);
          padding: 12px 14px;
          color: white;
          opacity: 0;
          pointer-events: none;
          box-shadow: 0 0 24px rgba(0, 225, 255, 0.35);
          backdrop-filter: blur(10px);
          transition: 0.25s ease;
        }

        .hotspotLabel strong {
          display: block;
          color: #7df7ff;
          font-size: 15px;
          font-weight: 900;
        }

        .hotspotLabel small {
          display: block;
          margin-top: 4px;
          color: white;
          font-size: 12px;
        }

        .hubHotspot:hover .hotspotGlow {
          display: none;
        }

        .hubHotspot:hover .hotspotLabel {
          opacity: 1;
          transform: translateX(-50%) translateY(-18px);
        }

        .hotspotPrototype {
          left: 35%;
          top: 0%;
          width: 30%;
          height: 17%;
        }

        .hotspotParts {
          left: 3%;
          top: 24%;
          width: 20%;
          height: 52%;
        }

        .hotspotPicks {
          left: 22%;
          top: 27%;
          width: 17%;
          height: 36%;
        }

        .hotspotExclusive {
          left: 60%;
          top: 27%;
          width: 17%;
          height: 36%;
        }

        .hotspotMachine {
          right: 0%;
          top: 24%;
          width: 24%;
          height: 52%;
        }
      `}</style>
    </main>
  );
}

function OptionGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-black uppercase tracking-wider text-cyan-300">
        {title}
      </p>

      <div className="grid grid-cols-1 gap-3">{children}</div>
    </div>
  );
}