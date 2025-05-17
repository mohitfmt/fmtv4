import {
  FaFacebookF,
  FaLinkedinIn,
  FaWhatsapp,
  FaTelegramPlane,
  FaWikipediaW,
  FaInstagram,
  FaYoutube,
  FaTiktok,
} from "react-icons/fa";
import { SiX, SiGooglenews } from "react-icons/si";

export const social = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/freemalaysiatoday/",
    icon: FaFacebookF,
    color: "#1877F2",
    size: 18,
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/freemalaysiatoday",
    icon: FaInstagram,
    color: "#E1306C",
    size: 20,
  },
  {
    name: "X",
    url: "https://x.com/fmtoday",
    icon: SiX,
    color: "#1DA1F2",
    size: 18,
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/user/FreeMalaysiaToday",
    icon: FaYoutube,
    color: "#FF0000",
    size: 24,
  },
  {
    name: "WhatsApp",
    url: "https://www.whatsapp.com/channel/0029Va78sJa96H4VaQu6580F",
    icon: FaWhatsapp,
    color: "#25D366",
    size: 20,
  },
  {
    name: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Free_Malaysia_Today",
    icon: FaWikipediaW,
    color: "#FFFFFF",
    size: 22,
  },
  {
    name: "Telegram",
    url: "https://t.me/FreeMalaysiaToday",
    icon: FaTelegramPlane,
    color: "#0088CC",
    size: 22,
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/fmt-news/",
    icon: FaLinkedinIn,
    color: "#0A66C2",
    size: 22,
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@freemalaysiatoday?_t=8UsJzt8DCWP&_r=1",
    icon: FaTiktok,
    color: "#FFFFFF",
    size: 18,
  },
  {
    name: "Google News",
    url: "https://news.google.com/publications/CAAqBwgKMJ6DqAwwsIu2BA?hl=en-MY&gl=MY&ceid=MY%3Aen",
    icon: SiGooglenews,
    color: "#4285F4",
    size: 22,
  },
] as const;

export const fbPageIds = [
  "323440711827", // Main Page
  "1756784177872528", // Lifestyle
  "1555977648046719", // Berita
];
