import { useState } from "react";
import { useRouter } from "next/router";
import { FaSearch, FaTimes } from "react-icons/fa";
import { Input } from "@/components/ui/input";

const SearchNews = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchTerm.trim()) {
      router.push(`/search?term=${encodeURIComponent(searchTerm.trim())}&category=all`);
      handleClose();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-accent-yellow rounded-full transition-colors"
        aria-label={isOpen ? "Close search" : "Open search"}
      >
        <FaSearch size={24} className="lg:text-white text-foreground" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black opacity-70 z-10"
            onClick={handleClose}
          />
          
          <div className="fixed top-14 lg:top-16 inset-0 z-20 flex items-top justify-center h-[55px]">
            <form
              onSubmit={handleSearch}
              className="flex items-center bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-white rounded shadow-lg md:w-[70%] w-[90%] p-2 border border-yellow-400"
            >
              <div className="relative flex-1">
                <Input
                  placeholder="Search for news"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded border-none bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-white outline-none p-2 px-3 font-semibold focus:ring-1 dark:focus:ring-white focus:ring-stone-700"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute dark:text-white dark:hover:text-black right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-yellow-400 text-black rounded-full transition-colors"
                  aria-label="Submit search"
                >
                  <FaSearch size={20} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="ml-2 p-2 hover:bg-stone-200 text-stone-700 dark:text-white rounded-full dark:hover:text-black transition-colors"
                aria-label="Clear and close search"
              >
                <FaTimes size={20} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default SearchNews;