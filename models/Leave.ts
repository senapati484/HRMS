import mongoose, { Document, Schema } from "mongoose";

export interface ILeave extends Document {
  userId: mongoose.Types.ObjectId;
  leaveType: "Paid" | "Sick" | "Unpaid";
  startDate: Date;
  endDate: Date;
  remarks?: string;
  status: "Pending" | "Approved" | "Rejected";
  hrComment?: string;
  decidedBy?: mongoose.Types.ObjectId;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    leaveType: { type: String, enum: ["Paid", "Sick", "Unpaid"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    remarks: { type: String },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    hrComment: { type: String },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

export const Leave = mongoose.models.Leave || mongoose.model<ILeave>("Leave", LeaveSchema);
