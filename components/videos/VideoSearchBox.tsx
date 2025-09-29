// components/videos/VideoSearchBox.tsx
import { useState, useCallback } from "react";
import { FaSearch } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

interface VideoSearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const VideoSearchBox = ({
  onSearch,
  placeholder = "Search videos...",
  className = "",
}: VideoSearchBoxProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);

      // Use debounced value for actual search
      if (debouncedSearch !== undefined) {
        onSearch(debouncedSearch);
      }
    },
    [debouncedSearch, onSearch]
  );

  return (
    <div className={`relative w-full max-w-md ${className}`}>
      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
      <Input
        type="search"
        placeholder={placeholder}
        className="pl-10 pr-4 w-full"
        value={searchQuery}
        onChange={handleSearchChange}
        aria-label="Search videos"
      />
    </div>
  );
};

export default VideoSearchBox;
