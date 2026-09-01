import "server-only";

import type { WorldAdapter } from "../types";
import {
  buildPayload,
  collectErrors,
  numberValue,
  rows,
  safeQuery,
} from "../utils";

type StockRow = {
  symbol?: string | null;
  name?: string | null;
  current_price?: number | null;
  previous_price?: number | null;
  is_active?: boolean | null;
  display_order?: number | null;
};

type HoldingRow = {
  id?: string | null;
  user_id?: string | null;
  symbol?: string | null;
  quantity?: number | null;
  average_price?: number | null;
};

type PropertyRow = {
  id?: string | null;
  code?: string | null;
  name?: string | null;
  district?: string | null;
  district_slug?: string | null;
  property_type?: string | null;
  building_name?: string | null;
  unit_type?: string | null;
  current_value?: number | null;
  listing_price?: number | null;
  weekly_rent?: number | null;
  available_quantity?: number | null;
  total_quantity?: number | null;
  area_sqm?: number | null;
  bedrooms?: number | null;
  display_order?: number | null;
  is_active?: boolean | null;
};

type PropertyHoldingRow = {
  id?: string | null;
  property_id?: string | null;
  quantity?: number | null;
  purchase_price?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type GenericRow = Record<string, unknown>;

export const observeMiloExchange: WorldAdapter = async ({
  admin,
  agentUserId,
  observedAt = new Date().toISOString(),
}) => {
  const [
    stocksResult,
    holdingsResult,
    tradesResult,
    priceHistoryResult,
    newsResult,
    propertiesResult,
    propertyHoldingsResult,
  ] = await Promise.all([
    safeQuery<StockRow[]>(
      "milo_exchange_stocks",
      admin
        .from("milo_exchange_stocks")
        .select(
          "symbol,name,current_price,previous_price,is_active,display_order",
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
    ),
    safeQuery<HoldingRow[]>(
      "milo_exchange_holdings",
      admin
        .from("milo_exchange_holdings")
        .select("id,user_id,symbol,quantity,average_price")
        .eq("user_id", agentUserId)
        .order("symbol", { ascending: true }),
    ),
    safeQuery<GenericRow[]>(
      "milo_exchange_trades",
      admin
        .from("milo_exchange_trades")
        .select("*")
        .eq("user_id", agentUserId)
        .order("created_at", { ascending: false })
        .limit(20),
    ),
    safeQuery<GenericRow[]>(
      "milo_exchange_price_history",
      admin
        .from("milo_exchange_price_history")
        .select("*")
        .order("price_date", { ascending: true })
        .limit(1000),
    ),
    safeQuery<GenericRow[]>(
      "milo_exchange_news_events",
      admin
        .from("milo_exchange_news_events")
        .select("*")
        .order("event_date", { ascending: true })
        .order("display_order", { ascending: true })
        .limit(500),
    ),
    safeQuery<PropertyRow[]>(
      "milo_exchange_properties",
      admin
        .from("milo_exchange_properties")
        .select(
          "id,code,name,district,district_slug,property_type,building_name,unit_type,current_value,listing_price,weekly_rent,available_quantity,total_quantity,area_sqm,bedrooms,display_order,is_active",
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
    ),
    safeQuery<PropertyHoldingRow[]>(
      "milo_exchange_property_holdings",
      admin
        .from("milo_exchange_property_holdings")
        .select(
          "id,property_id,quantity,purchase_price,created_at,updated_at",
        )
        .eq("user_id", agentUserId)
        .order("created_at", { ascending: false }),
    ),
  ]);

  const stocks = rows(stocksResult.data);
  const holdings = rows(holdingsResult.data);
  const properties = rows(propertiesResult.data);
  const propertyHoldings = rows(propertyHoldingsResult.data);

  const stockPriceBySymbol = new Map(
    stocks.map((row) => [String(row.symbol || ""), numberValue(row.current_price)]),
  );

  const propertyValueById = new Map(
    properties.map((row) => [String(row.id || ""), numberValue(row.current_value)]),
  );

  const stockPortfolioValue = holdings.reduce(
    (sum, row) =>
      sum +
      numberValue(row.quantity) *
        numberValue(stockPriceBySymbol.get(String(row.symbol || ""))),
    0,
  );

  const propertyPortfolioValue = propertyHoldings.reduce(
    (sum, row) =>
      sum +
      numberValue(row.quantity) *
        numberValue(propertyValueById.get(String(row.property_id || ""))),
    0,
  );

  const errors = collectErrors(
    stocksResult,
    holdingsResult,
    tradesResult,
    priceHistoryResult,
    newsResult,
    propertiesResult,
    propertyHoldingsResult,
  );

  return buildPayload({
    sourceKey: "milo.exchange",
    observedAt,
    requiredOk:
      stocksResult.ok &&
      holdingsResult.ok &&
      propertiesResult.ok &&
      propertyHoldingsResult.ok,
    errors,
    data: {
      safety: {
        readOnly: true,
        tradesExecuted: false,
        propertyPurchasesExecuted: false,
        humanLeaderboardDataIncluded: false,
      },
      stockMarket: {
        stocks,
        holdings,
        recentTrades: rows(tradesResult.data),
        priceHistory: rows(priceHistoryResult.data),
        newsEvents: rows(newsResult.data),
        estimatedPortfolioValue: stockPortfolioValue,
      },
      propertyMarket: {
        properties,
        holdings: propertyHoldings,
        estimatedPortfolioValue: propertyPortfolioValue,
      },
      estimatedExchangeAssetValue:
        stockPortfolioValue + propertyPortfolioValue,
    },
  });
};
