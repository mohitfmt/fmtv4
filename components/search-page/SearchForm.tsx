import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { filterOptions } from "@/constants/search-filters";

interface SearchFormValues {
  term: string;
  category: string;
}

const SearchForm = () => {
  const router = useRouter();
  const { term, category } = router.query;

  const { register, handleSubmit, setValue, watch, reset } =
    useForm<SearchFormValues>({
      defaultValues: {
        term: (term as string) || "",
        category: (category as string) || "all",
      },
    });

  useEffect(() => {
    reset({
      term: (term as string) || "",
      category: (category as string) || "all",
    });
  }, [term, category, reset]);

  const onSubmit = (values: SearchFormValues) => {
    router.push({
      pathname: "/search",
      query: {
        term: values.term,
        category: values.category,
      },
    });
  };

  const currentCategory = watch("category");
  const selectedOption = filterOptions.find(option => option.value === currentCategory);
  const categoryLabel = selectedOption ? selectedOption.name : 'Select category';

  return (
    <form
      className="grid grid-cols-10 gap-4 py-4 sm:grid-cols-12"
      onSubmit={handleSubmit(onSubmit)}
      role="search"
      aria-label="News search form"
    >
      <div className="col-span-5">
        <Input
          {...register("term", { required: true })}
          placeholder="Search for news"
          aria-label="Search term"
          type="search"
        />
      </div>
      <div className="col-span-5">
        <Select
          value={currentCategory}
          onValueChange={(value: string) => setValue("category", value)}
        >
          <SelectTrigger 
            aria-label={`Category filter: ${categoryLabel}`}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
          >
            <SelectValue placeholder="Select category" aria-label="Selected category" />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                className="cursor-pointer"
              >
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button 
        className="col-span-10 font-bold sm:col-span-2" 
        type="submit"
        aria-label="Submit search"
      >
        Search
      </Button>
    </form>
  );
};

export default SearchForm;