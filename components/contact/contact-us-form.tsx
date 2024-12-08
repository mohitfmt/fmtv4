"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { FaSpinner } from "react-icons/fa6";
// import { Spinner } from "@phosphor-icons/react";

type ContactFormValues = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const ContactUsForm = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const form = useForm<ContactFormValues>({
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const handleSubmit = async (values: ContactFormValues) => {
    setLoading(true);
    try {
      const response = await fetch("/api/send-mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      form.reset();
      toast.success("Message sent successfully!", {
        position: "top-center",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Failed to send message. Please try again.", {
        position: "top-center",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        className="max-w-xl space-y-4 py-8"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <FormField
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name*</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  {...form.register("name", {
                    required: "Name is required",
                    minLength: {
                      value: 3,
                      message: "Name must be at least 3 characters long",
                    },
                  })}
                />
              </FormControl>
              <FormMessage>{form.formState.errors.name?.message}</FormMessage>
            </FormItem>
          )}
          control={form.control}
          name="name"
        />
        <FormField
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Email*</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  {...form.register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                  type="email"
                />
              </FormControl>
              <FormMessage>{form.formState.errors.email?.message}</FormMessage>
            </FormItem>
          )}
          control={form.control}
          name="email"
        />
        <FormField
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject*</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  {...form.register("subject", {
                    required: "Subject is required",
                    minLength: {
                      value: 10,
                      message: "Subject must be at least 10 characters long",
                    },
                  })}
                />
              </FormControl>
              <FormMessage>
                {form.formState.errors.subject?.message}
              </FormMessage>
            </FormItem>
          )}
          control={form.control}
          name="subject"
        />
        <FormField
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message*</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  {...form.register("message", {
                    required: "Message is required",
                    minLength: {
                      value: 10,
                      message: "Message must be at least 10 characters long",
                    },
                  })}
                  className="resize-none"
                  placeholder="Tell us a little bit about yourself"
                />
              </FormControl>
              <FormMessage>
                {form.formState.errors.message?.message}
              </FormMessage>
            </FormItem>
          )}
          control={form.control}
          name="message"
        />
        <Button
          className="rounded-full"
          disabled={loading}
          size="lg"
          type="submit"
          variant="outline"
        >
          {loading ? (
            <FaSpinner className="h-4 w-4 animate-spin" />
          ) : (
            <span>Send</span>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ContactUsForm;
