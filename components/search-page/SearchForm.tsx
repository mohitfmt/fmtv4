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

  return (
    <form
      className="grid grid-cols-10 gap-4 py-4 sm:grid-cols-12"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="col-span-5">
        <Input
          {...register("term", { required: true })}
          placeholder="Search for news"
        />
      </div>
      <div className="col-span-5">
        <Select
          value={currentCategory}
          onValueChange={(value:any) => setValue("category", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {filterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button className="col-span-10 font-bold sm:col-span-2" type="submit">
        Search
      </Button>
    </form>
  );
};

export default SearchForm;
