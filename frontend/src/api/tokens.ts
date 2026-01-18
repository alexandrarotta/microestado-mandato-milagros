import { apiFetch } from "./client";

export type TokenPackId = "PACK_100" | "PACK_200" | "PACK_300";

export interface BuyTokensResponse {
  tokens: number;
  treasury: number;
  purchasedPack: TokenPackId;
  deltaTokens: number;
  deltaTreasury: number;
}

export async function buyTokensWithTreasury(
  token: string,
  pack: TokenPackId
) {
  return apiFetch<BuyTokensResponse>(
    "/api/tokens/buy",
    {
      method: "POST",
      body: JSON.stringify({ pack })
    },
    token
  );
}
