import mongoose, { Document, Schema } from "mongoose";

export type JobStatus = "pending" | "processing" | "failed" | "done";

export interface IWorkerJob extends Document {
  jobType: string;
  payload: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  status: JobStatus;
  runAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkerJobSchema = new Schema<IWorkerJob>(
  {
    jobType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    status: {
      type: String,
      enum: ["pending", "processing", "failed", "done"],
      default: "pending",
    },
    runAt: Date,
    errorMessage: String,
  },
  { timestamps: true }
);

WorkerJobSchema.index({ status: 1, runAt: 1 });

export const WorkerJob = mongoose.model<IWorkerJob>(
  "WorkerJob",
  WorkerJobSchema
);
