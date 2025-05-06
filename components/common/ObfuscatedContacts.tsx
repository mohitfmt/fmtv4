import React from "react";

type ObfuscatedEmailProps = {
  email: string;
  label?: string;
  className?: string;
};

// Helper to obfuscate email using HTML entities
const obfuscate = (email: string) =>
  email
    .split("")
    .map((char) => `&#${char.charCodeAt(0)};`)
    .join("");

const ObfuscatedEmail: React.FC<ObfuscatedEmailProps> = ({
  email,
  label,
  className = "text-accent-blue hover:underline",
}) => {
  const obfuscated = obfuscate(label || email);

  return (
    <a
      href={`mailto:${email}`}
      itemProp="email"
      aria-label={`Email ${email}`}
      className={className}
      dangerouslySetInnerHTML={{ __html: obfuscated }}
    />
  );
};

type ObfuscatedPhoneProps = {
  number: string; // E.g., "+603-7932 0608"
  label?: string; // Optional custom label
  className?: string; // Optional custom classes
};

const ObfuscatedPhone: React.FC<ObfuscatedPhoneProps> = ({
  number,
  label,
  className = "text-accent-blue hover:underline",
}) => {
  // Sanitize number for tel: (remove spaces, dashes)
  const telHref = `tel:${number.replace(/\s|-/g, "")}`;

  return (
    <a
      href={telHref}
      itemProp="telephone"
      aria-label={`Call ${number}`}
      className={className}
    >
      {label || number}
    </a>
  );
};

export { ObfuscatedPhone, ObfuscatedEmail };
