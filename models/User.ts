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
  companyName?: string;
  companyLogo?: string;
  about?: string;
  jobLove?: string;
  interests?: string;
  skills?: string[];
  certifications?: string[];
  dob?: Date;
  residingAddress?: string;
  nationality?: string;
  personalEmail?: string;
  gender?: string;
  maritalStatus?: string;
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    pan?: string;
    uan?: string;
  };
  documents?: {
    name: string;
    url: string;
    uploadedAt?: Date;
  }[];
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
    companyName: { type: String },
    companyLogo: { type: String },
    about: { type: String },
    jobLove: { type: String },
    interests: { type: String },
    skills: { type: [String], default: [] },
    certifications: { type: [String], default: [] },
    dob: { type: Date },
    residingAddress: { type: String },
    nationality: { type: String },
    personalEmail: { type: String },
    gender: { type: String },
    maritalStatus: { type: String },
    bankDetails: {
      accountNumber: { type: String },
      bankName: { type: String },
      ifscCode: { type: String },
      pan: { type: String },
      uan: { type: String },
    },
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      }
    ],
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
