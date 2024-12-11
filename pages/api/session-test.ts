import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req: any, res: any) {
  const session = await getServerSession(req, res, authOptions);
  if (session) {
    res.status(200).json({ session });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}