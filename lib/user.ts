import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TIERS, ACTION_LIMITS, TierName } from '@/config/billing.config';
import { getAWSConfig } from './aws-config';

const ddbClient = new DynamoDBClient(getAWSConfig());

const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE = 'DDBUserAccess';

export interface UserRecord {
  email: string;
  name: string;
  image?: string;
  tier: TierName;
  usage: Record<string, number>;
  usagePeriod: string; // YYYY-MM
  createdAt: string;
}

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export async function getOrCreateUser(email: string, name?: string, image?: string): Promise<UserRecord> {
  const res = await docClient.send(new GetCommand({ TableName: TABLE, Key: { email } }));
  if (res.Item) {
    const user = res.Item as UserRecord;
    // Reset usage if new month
    if (user.usagePeriod !== currentPeriod()) {
      user.usage = {};
      user.usagePeriod = currentPeriod();
      await docClient.send(new PutCommand({ TableName: TABLE, Item: user }));
    }
    return user;
  }
  const user: UserRecord = {
    email,
    name: name || '',
    image,
    tier: 'free',
    usage: {},
    usagePeriod: currentPeriod(),
    createdAt: new Date().toISOString(),
  };
  await docClient.send(new PutCommand({ TableName: TABLE, Item: user }));
  return user;
}

export interface LimitCheck {
  allowed: boolean;
  reason?: string;
  current: number;
  limit: number;
  tierRequired?: TierName;
}

export async function checkLimit(email: string, action: string): Promise<LimitCheck> {
  const user = await getOrCreateUser(email);
  const actionConfig = ACTION_LIMITS[action];
  if (!actionConfig) return { allowed: true, current: 0, limit: 999 };

  const tierOrder: TierName[] = ['free', 'base', 'premium'];
  const userTierIdx = tierOrder.indexOf(user.tier);

  // Check if feature is locked for this tier
  if (actionConfig.lockedBelow) {
    const requiredIdx = tierOrder.indexOf(actionConfig.lockedBelow);
    if (userTierIdx < requiredIdx) {
      return {
        allowed: false,
        reason: `This feature requires ${TIERS[actionConfig.lockedBelow].name} plan`,
        current: 0,
        limit: 0,
        tierRequired: actionConfig.lockedBelow,
      };
    }
  }

  const tierLimits = TIERS[user.tier].limits;
  const limit = tierLimits[actionConfig.limitKey];
  const current = user.usage[actionConfig.limitKey] || 0;

  if (current >= limit) {
    const nextTier = tierOrder[userTierIdx + 1] as TierName | undefined;
    return {
      allowed: false,
      reason: `You've reached your ${TIERS[user.tier].name} plan limit`,
      current,
      limit,
      tierRequired: nextTier,
    };
  }

  return { allowed: true, current, limit };
}

export async function incrementUsage(email: string, action: string): Promise<void> {
  const actionConfig = ACTION_LIMITS[action];
  if (!actionConfig) return;
  const key = actionConfig.limitKey;
  const period = currentPeriod();

  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { email },
    UpdateExpression: 'SET #usage.#key = if_not_exists(#usage.#key, :zero) + :one, #period = :period',
    ExpressionAttributeNames: { '#usage': 'usage', '#key': key, '#period': 'usagePeriod' },
    ExpressionAttributeValues: { ':one': 1, ':zero': 0, ':period': period },
  }));
}

export async function upgradeTier(email: string, newTier: TierName): Promise<UserRecord> {
  await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { email },
    UpdateExpression: 'SET #tier = :tier',
    ExpressionAttributeNames: { '#tier': 'tier' },
    ExpressionAttributeValues: { ':tier': newTier },
  }));
  return getOrCreateUser(email);
}

export async function getUserUsage(email: string) {
  const user = await getOrCreateUser(email);
  const tierLimits = TIERS[user.tier].limits;
  return {
    tier: user.tier,
    tierName: TIERS[user.tier].name,
    price: TIERS[user.tier].price,
    usage: Object.fromEntries(
      Object.entries(tierLimits).map(([key, limit]) => [key, { used: user.usage[key] || 0, limit }])
    ),
  };
}
