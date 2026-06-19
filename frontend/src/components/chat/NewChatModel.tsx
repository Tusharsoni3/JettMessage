import { useState } from "react";
import { userApi } from "../../services/authApi";
import { dbService, type ContactKey } from "../../services/dbService";

export function useAddContact() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddFriend = async (searchEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch the friend's details from your PostgreSQL backend
      const foundUser = await userApi.searchUser(searchEmail);

      // 2. Format the data to match the ContactKey interface we wrote in the Canvas
      const newContact: ContactKey = {
        name: foundUser.name,
        email: foundUser.email,
        userId: foundUser.id,
        publicKey: foundUser.publicKey,
      };

      // 3. Save it to the browser's IndexedDB using our new Canvas method!
      await dbService.saveContactPublicKey(newContact);

      console.log("Success! Friend's padlock is pinned locally.");

      // 4. (Optional) Redirect the user to the new chat window now!
      // history.push(`/chat/${foundUser.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add friend");
    } finally {
      setLoading(false);
    }
  };

  return { handleAddFriend, loading, error };
}
