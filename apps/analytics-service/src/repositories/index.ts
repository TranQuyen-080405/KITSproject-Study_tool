// This file will provide data access owned by the Analytics Service
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config/index.js";
import type { ReviewRecord } from "../services/index.js";

type Database = { reviews: Record<string, ReviewRecord> };
const keyFor = (userId: string, vocabularyId: string) => `${userId}::${vocabularyId}`;

export class ReviewRepository {
  private database: Database = { reviews: {} };
  private loaded = false;
  private writeQueue: Promise<void> = Promise.resolve();

  async get(userId: string, vocabularyId: string): Promise<ReviewRecord | undefined> {
    await this.ensureLoaded();
    return this.database.reviews[keyFor(userId, vocabularyId)];
  }

  async save(review: ReviewRecord): Promise<ReviewRecord> {
    await this.ensureLoaded();
    this.database.reviews[keyFor(review.userId, review.vocabularyId)] = review;
    this.writeQueue = this.writeQueue.then(() => this.persist());
    await this.writeQueue;
    return review;
  }

  async listByUser(userId: string): Promise<ReviewRecord[]> {
    await this.ensureLoaded();
    return Object.values(this.database.reviews).filter((review) => review.userId === userId);
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(config.dataFile, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && "reviews" in parsed) this.database = parsed as Database;
    } catch (error: unknown) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await mkdir(path.dirname(config.dataFile), { recursive: true });
    const temporaryFile = `${config.dataFile}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(this.database, null, 2), "utf8");
    await rename(temporaryFile, config.dataFile);
  }
}

export const reviewRepository = new ReviewRepository();
