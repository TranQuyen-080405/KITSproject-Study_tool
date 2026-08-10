// This file loads runtime configuration for the Analytics Service.
export const analyticsServiceConfig = {
  port: Number(process.env.ANALYTICS_SERVICE_PORT ?? 3005),
  rabbitMqUrl: process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672",
};
