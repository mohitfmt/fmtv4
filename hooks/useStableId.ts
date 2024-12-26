import { useEffect, useState } from "react";
import { nanoid } from "nanoid";

export function useStableId() {
  const [id, setId] = useState("");

  useEffect(() => {
    setId(nanoid());
  }, []);

  return id || "";
}
