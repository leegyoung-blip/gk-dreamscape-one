export type AgentReportMode =
  | "CURRENT"
  | "DAILY"
  | "RANGE";

export type AgentReportHealthStatus =
  | "HEALTHY"
  | "WATCH"
  | "WARNING"
  | "UNHEALTHY"
  | "CRITICAL"
  | string;

export type AgentReportTransaction = {
  occurred_at: string;
  agent_user_id: string;
  agent_code: string;
  agent_name: string;
  currency_code: "DT" | "DG" | string;
  transaction_id: string;
  transaction_type: string;
  direction: string;
  amount: number;
  title: string | null;
  source: string | null;
  description: string | null;
  balance_after: number | null;
  source_id: string | null;
  source_table: string | null;
};

export type AgentEconomyHealthReport = {
  schema_version: string;

  report_mode:
    AgentReportMode;

  timezone: string;

  generated_at: string;

  window: {
    start: string;
    end: string;
    label: string;
  };

  overall_health: {
    status:
      AgentReportHealthStatus;

    reasons:
      string[];
  };

  economy: {
    status:
      AgentReportHealthStatus;

    transactions: {
      total: number;
      agents_with_transactions: number;

      dt_transaction_count: number;
      dg_transaction_count: number;

      dt_earned: number;
      dt_spent: number;
      dt_net: number;

      dg_earned: number;
      dg_spent: number;
      dg_net: number;

      dt_earn_to_spend_ratio:
        number | null;
    };

    synthetic_activity: {
      completions: number;
      active_agents: number;
      dt_awarded: number;
      dg_awarded: number;
      by_action: unknown[];
    };

    synthetic_spending: {
      spend_actions: number;
      agents_that_spent: number;
      dt_spend_actions: number;
      dt_spent: number;
      dg_spend_actions: number;
      dg_spent: number;
      by_currency: unknown[];
    };

    wallet_integrity: {
      agents_checked: number;

      total_dt_balance: number;
      total_dg_balance: number;

      dt_mismatch_agents: number;
      dg_mismatch_agents: number;

      dt_total_delta: number;
      dg_total_delta: number;
    };

    controls: {
      max_spends_per_agent_day: number;

      agent_days_over_spend_limit: number;

      invalid_spend_rows: number;
      missing_budget_links: number;

      dt_budget_violations: number;
      dg_budget_violations: number;

      dt_reserve_violations: number;
      dg_reserve_violations: number;

      dt_spend_ledger_match: boolean;
      dg_spend_ledger_match: boolean;
    };
  };

  stocks: {
    status:
      AgentReportHealthStatus;

    market: {
      active_stocks: number;
      invalid_price_rows: number;
      advancers: number;
      decliners: number;
      unchanged: number;

      average_change_pct: number;
      largest_absolute_move_pct: number;
      unusually_large_moves: number;
    };

    bot_exposure: {
      holding_rows: number;
      bot_holders: number;

      total_market_value: number;

      top5_holder_concentration_pct:
        number | null;

      invalid_holdings: number;
      inactive_stock_holdings: number;
    };
  };

  property: {
    status:
      AgentReportHealthStatus;

    market: {
      active_properties: number;
      invalid_property_rows: number;

      total_units: number;
      available_units: number;

      availability_pct: number;

      average_listing_premium_pct: number;
    };

    bot_exposure: {
      holding_rows: number;
      bot_holders: number;

      total_market_value: number;

      top5_holder_concentration_pct:
        number | null;

      invalid_holdings: number;

      inactive_property_holdings: number;
    };
  };

  runtime: {
    status:
      AgentReportHealthStatus;

    population: {
      total_agents: number;
      active_agents: number;
      execution_enabled_agents: number;
      auto_paused_agents: number;
      failure_streak_agents: number;
    };

    failures: {
      open_failures: number;
      open_critical_failures: number;
      failures_created_in_window: number;
    };

    sessions: {
      stale_open_sessions: number;
    };

    scheduler: {
      recent_shards: number;
      failed_latest_shards: number;

      oldest_latest_tick_minutes:
        number | null;
    };

    agents_enabled: boolean;

    public_visibility_enabled: boolean;

    leaderboard_visibility_enabled: boolean;

    exchange_visibility_enabled: boolean;
  };

  export: {
    transaction_rows: number;
    transaction_function: string;
  };

  architecture:
    Record<
      string,
      unknown
    >;
};