import React from "react";

const contactInfo = {
  editorial: {
    email: "editor@freemalaysiatoday.com",
    description: "Please note that articles exclusively sent to FMT stand a better chance of publication.",
    mailto: "mailto:editor@freemalaysiatoday.com",
  },
  advertising: {
    email: "advertise@freemalaysiatoday.com",
    phone: "+603-7932 0608",
    mailto: "mailto:advertise@freemalaysiatoday.com",
    tel: "tel:+60379320608",
  },
  career: {
    email: "career@freemalaysiatoday.com",
    phone: "+603-7932 0608",
    mailto: "mailto:career@freemalaysiatoday.com",
    tel: "tel:+60379320608",
  },
};

const ContactDetails: React.FC = () => (
  <div>
    <h2 className="text-2xl font-bold">Alternatively, email or call us.</h2>

    <h3 className="mt-4 text-lg font-bold">
      Editorial related matters and letters/opinions for publication:
    </h3>
    <p className="pb-3 pt-1">
      <a
        href={contactInfo.editorial.mailto}
        className="text-blue-500 hover:underline"
      >
        {contactInfo.editorial.email}
      </a>
      . {contactInfo.editorial.description}
    </p>

    <h3 className="mt-2 text-lg font-bold">Advertising</h3>
    <p className="pb-3 pt-1">
      <a
        href={contactInfo.advertising.mailto}
        className="text-blue-500 hover:underline block sm:inline"
      >
        {contactInfo.advertising.email}
      </a>
      <span className="mx-2 cursor-default block sm:inline">or</span>
      <a
        href={contactInfo.advertising.tel}
        className="text-blue-500 hover:underline block sm:inline"
      >
        {contactInfo.advertising.phone}
      </a>
    </p>

    <h3 className="mt-2 text-lg font-bold">Career</h3>
    <p className="pb-3 pt-1">
      <a
        href={contactInfo.career.mailto}
        className="text-blue-500 hover:underline block sm:inline"
      >
        {contactInfo.career.email}
      </a>
      <span className="mx-2 cursor-default block sm:inline">or</span>
      <a
        href={contactInfo.career.tel}
        className="text-blue-500 hover:underline block sm:inline"
      >
        {contactInfo.career.phone}
      </a>
    </p>
  </div>
);

export default ContactDetails;
