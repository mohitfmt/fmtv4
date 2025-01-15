import { LuLoader } from "react-icons/lu";
import { Button } from "../ui/button";

interface LoadMoreButtonProps {
  isLoading: boolean;
  onClick: () => void;
  text?: string;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  text = "Load More",
  isLoading,
  onClick,
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      className="px-6 py-2 bg-yellow-400 text-black text-lg font-bold hover:bg-yellow-600"
    >
      {isLoading ? (
        <div className="flex text-lg items-center">
          <LuLoader className="w-6 h-6 mr-2 animate-spin" />
          Loading...
        </div>
      ) : (
        `${text}`
      )}
    </Button>
  );
};

export default LoadMoreButton;
