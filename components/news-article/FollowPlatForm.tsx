import Link from "next/link";
import { FaTelegramPlane } from "react-icons/fa";
import { SiGooglenews, SiWhatsapp } from "react-icons/si";

const FollowPlatforms = () => {
  return (
    <section
      className="flex w-full items-center justify-center my-8"
      aria-label="Social Media Follow Links"
    >
      <div className="my-2 flex flex-col items-center justify-center rounded-lg bg-blue-100  px-4 py-2.5">
        <p className="text-center font-roboto text-sm text-black italic md:text-base">
          Stay current - Follow FMT on WhatsApp, Google news and Telegram
        </p>
        <div className="mt-4 flex w-full items-center justify-center gap-8 px-4 md:gap-12">
          <Link
            className="flex items-center justify-center gap-2 rounded-lg bg-[#25d366] px-5 py-3.5 text-white md:px-4 md:py-2"
            href="https://whatsapp.com/channel/0029Va78sJa96H4VaQu6580F"
            rel="noreferrer"
            target="_blank"
            aria-label="Follow us on WhatsApp"
          >
            <SiWhatsapp
              className="text-4xl md:text-xl text-black"
              aria-hidden="true"
              role="img"
            />
            <span className="hidden text-black font-heading font-bold md:flex">
              WhatsApp
            </span>
          </Link>

          <Link
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3.5 text-black md:px-4 md:py-2"
            href="https://news.google.com/publications/CAAqBwgKMJ6DqAwwsIu2BA"
            rel="noreferrer"
            target="_blank"
            aria-label="Follow us on Google News"
          >
            <SiGooglenews
              className="text-4xl md:text-xl"
              aria-hidden="true"
              role="img"
            />
            <span className="hidden font-heading font-bold md:flex">
              Google News
            </span>
          </Link>

          <Link
            className="flex items-center justify-center gap-2 rounded-lg bg-[#24a1de] px-5 py-3.5 text-white md:px-4 md:py-2"
            href="https://t.me/FreeMalaysiaToday"
            rel="noreferrer"
            target="_blank"
            aria-label="Follow us on Telegram"
          >
            <FaTelegramPlane
              className="text-4xl md:text-xl text-black"
              aria-hidden="true"
              role="img"
            />
            <span className="hidden font-heading font-bold md:flex text-black">
              Telegram
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FollowPlatforms;
