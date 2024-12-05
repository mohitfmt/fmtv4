import { useState, useEffect } from "react";
import { X, CheckCircle } from "@phosphor-icons/react";

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewsletterModal: React.FC<NewsletterModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState<string>("");
  const [isValidEmail, setIsValidEmail] = useState<boolean>(false);
  const [showValidation, setShowValidation] = useState<boolean>(false);

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase());
  };

  useEffect(() => {
    if (email.length >= 2) {
      setShowValidation(true);
      setIsValidEmail(validateEmail(email));
    } else {
      setShowValidation(false);
    }
  }, [email]);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    if (isValidEmail) {
      try {
        await saveEmailToDatabase(email);
        console.log("Email saved successfully:", email);
        onClose();
      } catch (error) {
        console.error("Error saving email:", error);
      }
    }
  };

  // Simulated database save function
  const saveEmailToDatabase = async (email: string): Promise<void> => {
    // Simulate an API call with a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("Saving email to database:", email);
        resolve();
      }, 1000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg max-w-md w-full relative">
        <X
          className="absolute top-2 right-2 text-gray-500 dark:text-gray-300 text-2xl cursor-pointer"
          onClick={onClose}
          weight="bold"
        />
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          Subscribe to Our Newsletter
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={`w-full p-2 rounded mb-1 border text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 ${
                showValidation
                  ? isValidEmail
                    ? "border-green-500"
                    : "border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              required
            />
            {isValidEmail && (
              <CheckCircle
                className="absolute right-2 top-3 text-green-500"
                weight="bold"
              />
            )}
          </div>
          {showValidation && !isValidEmail && (
            <p className="text-red-500 text-sm mb-2">
              Please enter a valid email address.
            </p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <button
              type="submit"
              className={`w-full py-2 rounded ${
                isValidEmail
                  ? "bg-yellow-400 text-black hover:bg-yellow-500 font-semibold"
                  : "bg-gray-300 text-gray-800 cursor-not-allowed"
              }`}
              disabled={!isValidEmail}
            >
              Subscribe
            </button>
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-sm text-gray-800 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewsletterModal;
