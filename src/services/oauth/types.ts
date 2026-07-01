export type SubscriptionType =
  | 'free'
  | 'pro'
  | 'max'
  | 'team'
  | 'enterprise'

export type BillingType = 'stripe' | 'invoice' | 'none' | string
export type RateLimitTier = string

export type OAuthProfileAccount = {
  uuid: string
  email: string
  display_name?: string | null
  created_at?: string
  has_claude_max?: boolean
  has_claude_pro?: boolean
}

export type OAuthProfileOrganization = {
  uuid: string
  organization_type?: string | null
  rate_limit_tier?: RateLimitTier | null
  has_extra_usage_enabled?: boolean | null
  billing_type?: BillingType | null
  subscription_created_at?: string | null
}

export type OAuthProfileResponse = {
  account: OAuthProfileAccount
  organization: OAuthProfileOrganization
  subscription?: Record<string, unknown>
}

export type OAuthTokenExchangeResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  scope?: string
  token_type?: string
  account?: {
    uuid: string
    email_address: string
  }
  organization?: {
    uuid: string
  }
}

export type OAuthTokens = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  scopes: string[]
  subscriptionType: SubscriptionType | null
  rateLimitTier: RateLimitTier | null
  profile?: OAuthProfileResponse
  tokenAccount?: {
    uuid: string
    emailAddress: string
    organizationUuid?: string
  }
}

export type UserRolesResponse = {
  organization_role?: string | null
  workspace_role?: string | null
  organization_name?: string | null
}

export type ReferralCampaign = string

export type ReferrerRewardInfo = {
  currency: string
  amount_minor_units: number
}

export type ReferralCodeDetails = {
  referral_link?: string
  campaign?: ReferralCampaign
}

export type ReferralEligibilityResponse = {
  eligible: boolean
  remaining_passes?: number
  referral_code_details?: ReferralCodeDetails
  referrer_reward?: ReferrerRewardInfo
}

export type ReferralRedemptionsResponse = {
  redemptions?: unknown[]
  limit?: number
  rewards?: ReferrerRewardInfo[]
}
