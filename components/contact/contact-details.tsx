import React from "react";
import { ObfuscatedEmail, ObfuscatedPhone } from "../common/ObfuscatedContacts";

// Define proper types for the contact info
type EditorialContact = {
  email: string;
  description: string;
};

type StandardContact = {
  email: string;
  phone: string;
};

type ContactInfoType = {
  editorial: EditorialContact;
  advertising: StandardContact;
  career: StandardContact;
  legal: StandardContact;
};

const contactInfo: ContactInfoType = {
  editorial: {
    email: "editor@freemalaysiatoday.com",
    description:
      "Please note that articles exclusively sent to FMT stand a better chance of publication.",
  },
  advertising: {
    email: "advertise@freemalaysiatoday.com",
    phone: "+603-7932 0608",
  },
  career: {
    email: "career@freemalaysiatoday.com",
    phone: "+603-7932 0608",
  },
  legal: {
    email: "legal@freemalaysiatoday.com",
    phone: "+603-7932 0608",
  },
};

const ContactDetails: React.FC = () => (
  <div itemScope itemType="http://schema.org/Organization">
    <h2 className="text-2xl font-bold">Alternatively, email or call us.</h2>

    <h3 className="mt-4 text-lg font-bold">
      Editorial related matters and letters/opinions for publication:
    </h3>
    <p className="pb-3 pt-1">
      <ObfuscatedEmail email={contactInfo.editorial.email} />
      {`. ${contactInfo.editorial.description}`}
    </p>

    {Object.entries(contactInfo)
      .filter(([key]) => key !== "editorial")
      .map(([key, value]) => {
        // Use type assertion to handle the different contact types
        const contact = value as StandardContact;
        return (
          <div key={key}>
            <h3 className="mt-2 text-lg font-bold">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </h3>
            <p className="pb-3 pt-1">
              <ObfuscatedEmail email={contact.email} />
              {contact.phone && (
                <>
                  <span className="mx-2 cursor-default block sm:inline">
                    or
                  </span>
                  <ObfuscatedPhone number={contact.phone} />
                </>
              )}
            </p>
          </div>
        );
      })}
  </div>
);

export default ContactDetails;
