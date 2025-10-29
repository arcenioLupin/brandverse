export const queueName = "brandverse.jobs";

export const connection = {
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};
