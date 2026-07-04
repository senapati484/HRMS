import mongoose, { Document, Schema } from "mongoose";

export interface IPayroll extends Document {
  userId: mongoose.Types.ObjectId;
  basic: number;
  allowances: number;
  deductions: number;
  net: number; // virtual
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    basic: { type: Number, required: true, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual net field
PayrollSchema.virtual("net").get(function () {
  return this.basic + this.allowances - this.deductions;
});

export const Payroll =
  mongoose.models.Payroll || mongoose.model<IPayroll>("Payroll", PayrollSchema);
