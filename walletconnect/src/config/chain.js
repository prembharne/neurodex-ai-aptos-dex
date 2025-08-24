// Chain / module configuration
// Replace with your deployed address (same as PERP_MODULE_ADDR / admin deployer)
export const MODULE_ADDR = import.meta.env.VITE_MODULE_ADDR || '0xYOUR_DEPLOYED_ACCOUNT';

export const MODULES = {
  perp_core: `${MODULE_ADDR}::perp_core`,
  margin_vault: `${MODULE_ADDR}::margin_vault`,
  ai_bridge: `${MODULE_ADDR}::ai_bridge`,
  governance: `${MODULE_ADDR}::governance`,
  liquidation_demo: `${MODULE_ADDR}::liquidation_demo`,
  simple_orderbook: `${MODULE_ADDR}::simple_orderbook`,
  minimal_test: `${MODULE_ADDR}::minimal_test`,
};
