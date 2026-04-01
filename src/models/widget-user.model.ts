import e from "express";
import moongose from "mongoose";

export interface IWidgetUser extends moongose.Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

const widgetUserSchema = new moongose.Schema<IWidgetUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export const WidgetUser = moongose.model<IWidgetUser>(
  "WidgetUser",
  widgetUserSchema,
);
