import { useState } from "react";
import { useRouter } from "next/router";
import { SearchIcon } from "lucide-react";

const SearchNews = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?term=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex">
      <input
        id="search"
        type="text"
        maxLength={160}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="rounded-md border border-stone-500 bg-stone-900 outline-none p-1 px-2 pr-7 font-rhd font-semibold"
        placeholder="Search for..."
      />
      <button type="submit" className="-ml-6" aria-label="Search">
        <SearchIcon className="px-0.5" />
        <span className="sr-only">Search</span>
      </button>
    </form>
  );
};

export default SearchNews;
