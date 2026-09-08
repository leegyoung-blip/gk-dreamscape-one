"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CollectionCatalog = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  world: string | null;
  total_items: number;
  collected_items: number;
  completion_percentage: number;
};

type MonsterDetail = {
  slug: string;
  topic: "world_explorer" | "time_traveller" | "science_sparks";
  hp: number;
  attack_rating: number;
  defense_rating: number;
  sprite_url: string;
  collection_image_url: string;
};

type CollectionItem = {
  id: string;
  source_type: string;
  source_id: string;
  display_name: string;
  rarity: string | null;
  image_url: string | null;
  is_collected: boolean;
  quantity: number;
  first_collected_at: string | null;
  last_collected_at: string | null;
  monster: MonsterDetail | null;
  metadata: Record<string, unknown>;
};

type CatalogResponse = {
  catalogs?: CollectionCatalog[];
};

type ItemsResponse = {
  catalog?: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    world: string | null;
  };
  items?: CollectionItem[];
};

function rarityLabel(value: string | null) {
  if (!value) return "Undiscovered";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function topicLabel(value: string | undefined) {
  if (value === "world_explorer") return "World Explorer";
  if (value === "time_traveller") return "Time Traveller";
  if (value === "science_sparks") return "Science Sparks";
  return "Knowledge Arena";
}

function stars(value: number | undefined) {
  if (!value) return "—";
  const rating = Math.max(1, Math.min(5, Math.round(value)));
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CollectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [catalogs, setCatalogs] = useState<CollectionCatalog[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<CollectionCatalog | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data, error: rpcError } = await supabase.rpc("get_my_collections_v1");
      if (!mounted) return;

      if (rpcError) {
        setError(rpcError.message || "Collections could not be loaded.");
        setLoading(false);
        return;
      }

      const response = (data || {}) as CatalogResponse;
      setCatalogs(Array.isArray(response.catalogs) ? response.catalogs : []);
      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function openCatalog(catalog: CollectionCatalog) {
    setSelectedCatalog(catalog);
    setItems([]);
    setSelectedItem(null);
    setItemsLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("get_my_collection_items_v1", {
      p_catalog_slug: catalog.slug,
    });

    setItemsLoading(false);

    if (rpcError) {
      setError(rpcError.message || "This Collection could not be loaded.");
      return;
    }

    const response = (data || {}) as ItemsResponse;
    setItems(Array.isArray(response.items) ? response.items : []);
  }

  const collectedCount = useMemo(
    () => items.filter((item) => item.is_collected).length,
    [items],
  );

  return (
    <main className="collection-page">
      <div className="collection-bg" />

      <header className="collection-topbar">
        <button type="button" onClick={() => router.back()}>
          ← Back
        </button>
        <button type="button" onClick={() => router.push("/profile")}>
          My Profile
        </button>
      </header>

      <section className="collection-hero">
        <p>DREAMSCAPE ONE</p>
        <h1>Collections</h1>
        <span>Discover, defeat and collect rare finds from across Dreamscape.</span>
      </section>

      <section className="collection-shell">
        {!selectedCatalog ? (
          <>
            <div className="collection-section-heading">
              <div>
                <small>MY COLLECTIONS</small>
                <h2>Your discoveries</h2>
              </div>
              <span>{catalogs.length} collection{catalogs.length === 1 ? "" : "s"}</span>
            </div>

            {loading ? (
              <div className="collection-empty">Loading Collections…</div>
            ) : error ? (
              <div className="collection-error">{error}</div>
            ) : catalogs.length === 0 ? (
              <div className="collection-empty">No Collections are available yet.</div>
            ) : (
              <div className="collection-catalog-grid">
                {catalogs.map((catalog) => (
                  <button
                    type="button"
                    key={catalog.id}
                    className="collection-catalog-card"
                    onClick={() => void openCatalog(catalog)}
                  >
                    <div className="collection-cover">
                      <div className="collection-cover-fallback">✦</div>
                      {catalog.cover_image_url && (
                        <img
                          src={catalog.cover_image_url}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <div className="collection-cover-shade" />
                      <span>{catalog.world || "Dreamscape"}</span>
                    </div>

                    <div className="collection-catalog-copy">
                      <small>COLLECTION</small>
                      <h3>{catalog.title}</h3>
                      <p>{catalog.description}</p>
                      <div className="collection-progress-copy">
                        <strong>
                          {catalog.collected_items} / {catalog.total_items} discovered
                        </strong>
                        <span>{Number(catalog.completion_percentage || 0).toFixed(0)}%</span>
                      </div>
                      <div className="collection-progress-track">
                        <i style={{ width: `${catalog.completion_percentage || 0}%` }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="collection-section-heading">
              <div>
                <button
                  type="button"
                  className="collection-inline-back"
                  onClick={() => {
                    setSelectedCatalog(null);
                    setSelectedItem(null);
                    setError("");
                  }}
                >
                  ← All Collections
                </button>
                <small>COLLECTION</small>
                <h2>{selectedCatalog.title}</h2>
                <p>{selectedCatalog.description}</p>
              </div>
              <span>
                {itemsLoading ? "Loading…" : `${collectedCount} / ${items.length} discovered`}
              </span>
            </div>

            {error ? (
              <div className="collection-error">{error}</div>
            ) : itemsLoading ? (
              <div className="collection-empty">Opening Collection…</div>
            ) : (
              <div className="collection-item-grid">
                {items.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`collection-item-card ${item.is_collected ? "is-owned" : "is-locked"}`}
                    onClick={() => item.is_collected && setSelectedItem(item)}
                  >
                    <div className="collection-item-art">
                      <div className="collection-item-silhouette">
                        {item.is_collected ? "✦" : "?"}
                      </div>
                      {item.image_url && item.is_collected && (
                        <img
                          src={item.image_url}
                          alt={item.display_name}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      {!item.is_collected && <div className="collection-lock-shade" />}
                    </div>
                    <div className="collection-item-copy">
                      <small>{rarityLabel(item.rarity)}</small>
                      <strong>{item.display_name}</strong>
                      {item.is_collected ? (
                        <span>Defeated ×{item.quantity}</span>
                      ) : (
                        <span>Undiscovered</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {selectedItem && selectedItem.is_collected && (
        <div className="collection-detail-layer" onClick={() => setSelectedItem(null)}>
          <article className="collection-detail-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="collection-detail-close" onClick={() => setSelectedItem(null)}>
              ×
            </button>
            <div className="collection-detail-art">
              <div className="collection-detail-fallback">{selectedItem.display_name}</div>
              {(selectedItem.monster?.collection_image_url || selectedItem.image_url) && (
                <img
                  src={selectedItem.monster?.collection_image_url || selectedItem.image_url || ""}
                  alt={selectedItem.display_name}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
            <div className="collection-detail-copy">
              <small>{rarityLabel(selectedItem.rarity)}</small>
              <h2>{selectedItem.display_name}</h2>
              <p>{topicLabel(selectedItem.monster?.topic)}</p>
              <div className="collection-detail-stats">
                <span>ATK <strong>{stars(selectedItem.monster?.attack_rating)}</strong></span>
                <span>DEF <strong>{stars(selectedItem.monster?.defense_rating)}</strong></span>
                <span>HP <strong>{selectedItem.monster?.hp ?? "—"}</strong></span>
                <span>Defeated <strong>×{selectedItem.quantity}</strong></span>
              </div>
              <div className="collection-detail-dates">
                <span>First defeated <strong>{formatDate(selectedItem.first_collected_at)}</strong></span>
                <span>Last defeated <strong>{formatDate(selectedItem.last_collected_at)}</strong></span>
              </div>
            </div>
          </article>
        </div>
      )}

      <style jsx global>{`
        html, body { min-height: 100%; background: #020813; }
        .collection-page { position: relative; min-height: 100vh; overflow-x: hidden; background: #020813; padding: 24px clamp(16px, 4vw, 54px) 64px; color: white; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .collection-bg { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(circle at 50% -10%, rgba(83,215,255,.16), transparent 38%), radial-gradient(circle at 100% 45%, rgba(147,51,234,.12), transparent 32%), linear-gradient(180deg,#041124 0%,#020813 100%); }
        .collection-topbar, .collection-hero, .collection-shell { position: relative; z-index: 2; }
        .collection-topbar { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .collection-topbar button, .collection-inline-back { min-height:40px; border:1px solid rgba(126,232,255,.2); border-radius:999px; background:rgba(255,255,255,.055); padding:0 15px; color:white; font-size:11px; font-weight:900; cursor:pointer; backdrop-filter:blur(14px); }
        .collection-hero { max-width:850px; margin:54px auto 0; text-align:center; }
        .collection-hero > p { margin:0; color:#7ee8ff; font-size:11px; font-weight:900; letter-spacing:.22em; }
        .collection-hero h1 { margin:8px 0 0; font-family:Georgia,"Times New Roman",serif; font-size:clamp(48px,7vw,88px); font-weight:400; letter-spacing:-.04em; }
        .collection-hero > span { display:block; margin:12px auto 0; color:rgba(255,255,255,.54); font-size:14px; line-height:1.6; }
        .collection-shell { max-width:1240px; margin:44px auto 0; }
        .collection-section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; }
        .collection-section-heading small { display:block; color:#7ee8ff; font-size:9px; font-weight:900; letter-spacing:.18em; }
        .collection-section-heading h2 { margin:5px 0 0; font-size:clamp(28px,4vw,42px); letter-spacing:-.035em; }
        .collection-section-heading p { max-width:650px; margin:7px 0 0; color:rgba(255,255,255,.48); font-size:12px; line-height:1.5; }
        .collection-section-heading > span { border:1px solid rgba(126,232,255,.16); border-radius:999px; background:rgba(126,232,255,.06); padding:8px 12px; color:#bff3ff; font-size:10px; font-weight:850; }
        .collection-inline-back { margin-bottom:12px; padding-inline:12px; min-height:34px; }
        .collection-catalog-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:18px; margin-top:18px; }
        .collection-catalog-card { display:grid; grid-template-columns:minmax(170px,.75fr) minmax(0,1.25fr); min-height:260px; overflow:hidden; border:1px solid rgba(126,232,255,.15); border-radius:26px; background:linear-gradient(145deg,rgba(10,38,68,.72),rgba(15,10,38,.78)); padding:0; color:white; text-align:left; cursor:pointer; box-shadow:0 22px 60px rgba(0,0,0,.25); transition:transform 160ms ease,border-color 160ms ease; }
        .collection-catalog-card:hover { transform:translateY(-2px); border-color:rgba(126,232,255,.35); }
        .collection-cover { position:relative; min-height:260px; overflow:hidden; background:radial-gradient(circle at 35% 30%,rgba(126,232,255,.2),rgba(76,29,149,.18) 48%,rgba(2,8,19,.9)); }
        .collection-cover img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .collection-cover-fallback { position:absolute; inset:0; display:grid; place-items:center; color:#7ee8ff; font-size:70px; opacity:.55; }
        .collection-cover-shade { position:absolute; inset:0; background:linear-gradient(180deg,transparent,rgba(2,8,19,.72)); }
        .collection-cover > span { position:absolute; left:14px; bottom:13px; z-index:3; border:1px solid rgba(255,255,255,.16); border-radius:999px; background:rgba(2,8,19,.68); padding:5px 8px; color:rgba(255,255,255,.7); font-size:8px; font-weight:900; text-transform:uppercase; }
        .collection-catalog-copy { display:flex; min-width:0; flex-direction:column; justify-content:center; padding:24px; }
        .collection-catalog-copy small { color:#c9a8ff; font-size:9px; font-weight:900; letter-spacing:.15em; }
        .collection-catalog-copy h3 { margin:6px 0 0; font-size:27px; line-height:1.08; }
        .collection-catalog-copy p { margin:9px 0 0; color:rgba(255,255,255,.5); font-size:12px; line-height:1.5; }
        .collection-progress-copy { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:20px; font-size:10px; }
        .collection-progress-copy span { color:#7ee8ff; font-weight:900; }
        .collection-progress-track { height:7px; margin-top:7px; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.08); }
        .collection-progress-track i { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#18c7ca,#4b70ff,#a84ce8); }
        .collection-item-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-top:18px; }
        .collection-item-card { min-width:0; overflow:hidden; border:1px solid rgba(255,255,255,.1); border-radius:18px; background:rgba(255,255,255,.035); padding:0; color:white; text-align:left; cursor:pointer; transition:transform 150ms ease,border-color 150ms ease; }
        .collection-item-card.is-owned:hover { transform:translateY(-2px); border-color:rgba(126,232,255,.32); }
        .collection-item-card.is-locked { cursor:default; opacity:.58; }
        .collection-item-art { position:relative; aspect-ratio:1/1; overflow:hidden; background:radial-gradient(circle at 50% 35%,rgba(126,232,255,.13),rgba(2,8,19,.82)); }
        .collection-item-art img { position:relative; z-index:2; width:100%; height:100%; object-fit:contain; }
        .collection-item-silhouette { position:absolute; inset:12%; display:grid; place-items:center; border:1px solid rgba(126,232,255,.14); border-radius:42% 58% 48% 52%; background:rgba(126,232,255,.06); color:rgba(255,255,255,.3); font-size:40px; }
        .collection-lock-shade { position:absolute; inset:0; z-index:3; background:linear-gradient(180deg,rgba(1,5,15,.08),rgba(1,5,15,.62)); backdrop-filter:grayscale(1) brightness(.55); }
        .collection-item-copy { padding:12px 13px 14px; }
        .collection-item-copy small { display:block; color:#7ee8ff; font-size:7px; font-weight:900; letter-spacing:.12em; text-transform:uppercase; }
        .collection-item-copy strong { display:block; margin-top:4px; overflow:hidden; font-size:13px; text-overflow:ellipsis; white-space:nowrap; }
        .collection-item-copy span { display:block; margin-top:4px; color:rgba(255,255,255,.42); font-size:8px; }
        .collection-empty,.collection-error { margin-top:18px; border:1px solid rgba(126,232,255,.12); border-radius:18px; background:rgba(255,255,255,.035); padding:28px; color:rgba(255,255,255,.55); text-align:center; }
        .collection-error { border-color:rgba(248,113,113,.22); color:#fecaca; }
        .collection-detail-layer { position:fixed; inset:0; z-index:100; display:grid; place-items:center; background:rgba(1,5,15,.82); padding:18px; backdrop-filter:blur(8px); }
        .collection-detail-card { position:relative; display:grid; width:min(820px,96vw); grid-template-columns:minmax(250px,.9fr) minmax(0,1.1fr); overflow:hidden; border:1px solid rgba(126,232,255,.2); border-radius:28px; background:linear-gradient(145deg,#071a35,#130c2f); box-shadow:0 32px 90px rgba(0,0,0,.55); }
        .collection-detail-close { position:absolute; top:14px; right:14px; z-index:5; display:grid; width:34px; height:34px; place-items:center; border:1px solid rgba(255,255,255,.14); border-radius:999px; background:rgba(2,8,19,.7); color:white; font-size:20px; cursor:pointer; }
        .collection-detail-art { position:relative; min-height:390px; overflow:hidden; background:radial-gradient(circle at 45% 35%,rgba(126,232,255,.18),rgba(76,29,149,.18) 45%,rgba(2,8,19,.9)); }
        .collection-detail-art img { position:relative; z-index:2; width:100%; height:100%; object-fit:contain; }
        .collection-detail-fallback { position:absolute; inset:0; display:grid; place-items:center; padding:30px; color:rgba(255,255,255,.32); font-size:20px; font-weight:900; text-align:center; }
        .collection-detail-copy { display:flex; flex-direction:column; justify-content:center; padding:34px; }
        .collection-detail-copy > small { color:#c9a8ff; font-size:9px; font-weight:900; letter-spacing:.15em; text-transform:uppercase; }
        .collection-detail-copy h2 { margin:6px 0 0; font-size:38px; line-height:1; }
        .collection-detail-copy > p { margin:8px 0 0; color:#7ee8ff; font-size:11px; font-weight:850; }
        .collection-detail-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin-top:22px; }
        .collection-detail-stats span,.collection-detail-dates span { border-radius:10px; background:rgba(255,255,255,.04); padding:9px; color:rgba(255,255,255,.4); font-size:8px; }
        .collection-detail-stats strong,.collection-detail-dates strong { display:block; margin-top:3px; color:white; font-size:11px; }
        .collection-detail-dates { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin-top:7px; }
        @media (max-width:700px) { .collection-page{padding-inline:14px}.collection-hero{margin-top:35px}.collection-section-heading{align-items:flex-start;flex-direction:column}.collection-catalog-grid{grid-template-columns:1fr}.collection-catalog-card{grid-template-columns:1fr;min-height:0}.collection-cover{min-height:190px}.collection-item-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.collection-detail-card{grid-template-columns:1fr;max-height:92vh;overflow-y:auto}.collection-detail-art{min-height:260px}.collection-detail-copy{padding:22px}.collection-detail-copy h2{font-size:30px} }
      `}</style>
    </main>
  );
}
