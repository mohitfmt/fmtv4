import { CheckCircle, CircleX } from "lucide-react";
import { useState, useEffect } from "react";

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewsletterModal = ({ isOpen, onClose }: NewsletterModalProps) => {
  const [email, setEmail] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  useEffect(() => {
    if (email.length >= 2) {
      setShowValidation(true);
      setIsValidEmail(validateEmail(email));
    } else {
      setShowValidation(false);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
  const saveEmailToDatabase = async (email: string) => {
    // Simulate an API call with a delay
    // return new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve();
    //   }, 1000);
    // });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
      <div className="bg-white p-8 rounded-lg max-w-md w-full relative">
        <CircleX
          className="absolute top-2 right-2 text-gray-500 text-2xl cursor-pointer"
          onClick={onClose}
        />
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Subscribe to Our Newsletter
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={`w-full text-black p-2 border rounded mb-1 ${
                showValidation
                  ? isValidEmail
                    ? "border-green-500"
                    : "border-red-500"
                  : "border-gray-300"
              }`}
              required
            />
            {isValidEmail && (
              <CheckCircle className="absolute right-2 top-3 text-green-500" />
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
                  ? "bg-yellow-400 text-black hover:bg-yellow-500"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!isValidEmail}
            >
              Subscribe
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 bg-gray-200 rounded hover:bg-gray-300"
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
