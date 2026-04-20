import type { FastifyReply } from "fastify";

export class HttpError extends Error {
  public readonly statusCode: number;

  public constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const sendError = (reply: FastifyReply, error: unknown) => {
  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send({ error: error.message });
  }

  console.error(error);
  return reply.status(500).send({ error: "Internal server error" });
};
