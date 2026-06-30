export type SubscriptionType = 'free' | 'pro' | 'max' | 'team' | 'enterprise' | string
export type BillingType = 'stripe' | 'invoice' | 'none' | string
export type RateLimitTier = string

export type OAuthTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  scopes?: string[]
  subscriptionType?: SubscriptionType
  rateLimitTier?: RateLimitTier
  [key: string]: unknown
}

export type OAuthTokenExchangeResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
  [key: string]: unknown
}

export type OAuthProfileResponse = {
  account?: Record<string, unknown>
  organization?: Record<string, unknown>
  subscription?: Record<string, unknown>
  [key: string]: unknown
}

export type UserRolesResponse = {
  roles?: string[]
  [key: string]: unknown
}

export type ReferrerRewardInfo = Record<string, unknown>

export type ReferralRedemptionsResponse = {
  redemptions?: unknown[]
  rewards?: ReferrerRewardInfo[]
  [key: string]: unknown
}
