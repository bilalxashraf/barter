import PgBoss from "pg-boss";

export const queueNames = {
  processSocialEvent: "social-events.process",
  sendChannelReply: "channel-replies.send",
  pollXEvents: "x-events.poll"
} as const;

export type ProcessSocialEventJob = {
  socialEventId: string;
};

export type SendChannelReplyJob = {
  paymentIntentId: string;
  targetEventId: string;
};

export type PollXEventsJob = {
  source: "polling";
};

export function createQueue(input: { connectionString: string; schema?: string }) {
  return new PgBoss({
    connectionString: input.connectionString,
    schema: input.schema ?? "public"
  });
}

export async function ensureQueues(boss: PgBoss): Promise<void> {
  for (const name of Object.values(queueNames)) {
    const queue = await boss.getQueue(name);
    if (queue) {
      continue;
    }

    await boss.createQueue(name);
  }
}

export async function enqueueSocialEvent(
  boss: PgBoss,
  payload: ProcessSocialEventJob
): Promise<string | null> {
  return boss.send(queueNames.processSocialEvent, payload, {
    retryLimit: 5,
    retryDelay: 10,
    retryBackoff: true
  });
}

export async function enqueueChannelReply(
  boss: PgBoss,
  payload: SendChannelReplyJob
): Promise<string | null> {
  return boss.send(queueNames.sendChannelReply, payload, {
    retryLimit: 5,
    retryDelay: 5,
    retryBackoff: true
  });
}

export async function enqueuePollingTick(
  boss: PgBoss,
  payload: PollXEventsJob = { source: "polling" }
): Promise<string | null> {
  return boss.send(queueNames.pollXEvents, payload, {
    singletonKey: queueNames.pollXEvents
  });
}
