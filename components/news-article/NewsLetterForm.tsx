"use client";
import React, { useState } from "react";
import { LogoSVG } from "../ui/icons/LogoSVG";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const NewsletterForm = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic email validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Smartech integration
    if (typeof window.smartech !== "undefined") {
      window.smartech("identify", email);
      window.smartech("dispatch", "subscribe click", {
        email: email,
      });
      window.smartech("contact", "2", {
        "pk^email": email,
      });
    }

    // Mailchimp subscribe
    window.open(
      `https://freemalaysiatoday.us12.list-manage.com/subscribe/post?u=10ca97079c5df7d7c739c5521&id=dfafd0994c&EMAIL=${email}`
    );
  };

  return (
    <div className="flex flex-col justify-center gap-2 lg:flex-row lg:gap-8 my-16">
      <LogoSVG className="h-20 md:h-24" />
      <div>
        <h3 className="text-center font-roboto text-lg lg:text-left">
          Subscribe to our newsletter and get news delivered to your mailbox.
        </h3>
        <form
          className="flex gap-4 py-4 justify-center lg:justify-start"
          onSubmit={handleSubscribe}
        >
          <div className="flex flex-col ">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-none border-0 border-b border-gray-300  md:min-w-[250px] outline-none focus-visible:ring-0 focus-visible:ring-transparent"
              placeholder="Email address"
              type="email"
            />

            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <Button className="text-sm font-bold uppercase" type="submit">
            Subscribe
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewsletterForm;
