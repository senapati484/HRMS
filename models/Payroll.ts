import mongoose, { Document, Schema } from "mongoose";

export interface IPayroll extends Document {
  userId: mongoose.Types.ObjectId;
  monthlyWage: number;
  yearlyWage: number;
  workingDaysPerWeek: number;
  breakTime: number;
  basic: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  leaveTravelAllowance: number;
  fixedAllowance: number;
  employeePF: number;
  employerPF: number;
  professionalTax: number;
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
    monthlyWage: { type: Number, required: true, default: 0 },
    yearlyWage: { type: Number, required: true, default: 0 },
    workingDaysPerWeek: { type: Number, default: 5 },
    breakTime: { type: Number, default: 1 },
    basic: { type: Number, required: true, default: 0 },
    hra: { type: Number, default: 0 },
    standardAllowance: { type: Number, default: 0 },
    performanceBonus: { type: Number, default: 0 },
    leaveTravelAllowance: { type: Number, default: 0 },
    fixedAllowance: { type: Number, default: 0 },
    employeePF: { type: Number, default: 0 },
    employerPF: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 200 },
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

// Auto-calculate components before saving
PayrollSchema.pre("save", function (next) {
  const wage = this.monthlyWage || 0;
  this.yearlyWage = wage * 12;
  this.basic = Math.round(wage * 0.5 * 100) / 100;
  this.hra = Math.round(this.basic * 0.5 * 100) / 100; // 50% of basic
  this.standardAllowance = Math.round(wage * 0.0833 * 100) / 100;
  this.performanceBonus = Math.round(wage * 0.0833 * 100) / 100;
  this.leaveTravelAllowance = Math.round(wage * 0.0833 * 100) / 100;
  
  const sumOther = this.basic + this.hra + this.standardAllowance + this.performanceBonus + this.leaveTravelAllowance;
  this.fixedAllowance = Math.max(0, Math.round((wage - sumOther) * 100) / 100);

  this.employeePF = Math.round(this.basic * 0.12 * 100) / 100;
  this.employerPF = Math.round(this.basic * 0.12 * 100) / 100;
  this.professionalTax = 200;

  // Backward compatibility fields
  this.allowances = this.hra + this.standardAllowance + this.performanceBonus + this.leaveTravelAllowance + this.fixedAllowance;
  this.deductions = this.employeePF + this.professionalTax;

  next();
});

// Virtual net field
PayrollSchema.virtual("net").get(function () {
  return this.basic + this.allowances - this.deductions;
});

export const Payroll =
  mongoose.models.Payroll || mongoose.model<IPayroll>("Payroll", PayrollSchema);
