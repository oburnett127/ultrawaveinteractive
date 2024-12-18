import { Request } from "express";

// Extend the Request interface
declare global {
  namespace Express {
    interface Request {
      validatedData: {
        googleProviderId: string;
        email: string;
        receiptEmail: string;
        nonce: string;
        amount: number;
      };
    }
  }
}
