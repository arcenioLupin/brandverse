import bullmq from "bullmq";
const { Queue } = bullmq;

import { queueName, connection } from "@brandverse/shared/queue.js";

export const queue = new Queue(queueName, { connection });
