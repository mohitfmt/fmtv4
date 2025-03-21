import { useState } from "react";
import { nanoid } from "nanoid";

export function useStableId() {
  const [id, setId] = useState(nanoid());

  // Function to refresh the ID
  const refreshId = () => {
    setId(nanoid());
  };

  return {
    id: id || "",
    refreshId,
  };
}
