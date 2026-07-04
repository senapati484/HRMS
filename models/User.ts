import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  employeeId: string;
  email: string;
  passwordHash: string;
  role: "employee" | "admin";
  phone?: string;
  address?: string;
  profilePicture?: string;
  department?: string;
  designation?: string;
  joinDate?: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    employeeId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["employee", "admin"], default: "employee" },
    phone: { type: String },
    address: { type: String },
    profilePicture: { type: String },
    department: { type: String },
    designation: { type: String },
    joinDate: { type: Date },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
