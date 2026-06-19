import { ilike, or, ne, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";

export const searchUsers = async (req, res) => {
  try {
    const query = String(req.query.q ?? req.query.name ?? "").trim();

    if (!query) {
      return res.status(200).json({ success: true, users: [] });
    }

    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        publicKey: users.publicKey,
      })
      .from(users)
      .where(
        and(
          or(ilike(users.name, `%${query}%`), ilike(users.email, `%${query}%`)),
          ne(users.id, req.user.id),
        ),
      )
      .limit(10);

    return res.status(200).json({ success: true, users: results });
  } catch (error) {
    console.error("searchUsers error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong while searching users",
      });
  }
};
