import {
  FacebookLogo,
  InstagramLogo,
  TwitterLogo,
  FileText,
  PaperPlaneTilt,
  YoutubeLogo,
  WhatsappLogo,
  LinkedinLogo,
  TiktokLogo,
  Newspaper,
} from "@phosphor-icons/react";

export const social = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/profile.php?id=100064467980422",
    icon: FacebookLogo,
    color: "#1877F2",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/freemalaysiatoday",
    icon: InstagramLogo,
    color: "#E1306C",
  },
  {
    name: "Twitter",
    url: "https://x.com/fmtoday",
    icon: TwitterLogo,
    color: "#1DA1F2",
  },
  {
    name: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Free_Malaysia_Today",
    icon: FileText,
    color: "#FFFFFF",
  },
  {
    name: "Telegram",
    url: "https://t.me/FreeMalaysiaToday",
    icon: PaperPlaneTilt,
    color: "#0088CC",
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/user/FreeMalaysiaToday",
    icon: YoutubeLogo,
    color: "#FF0000",
  },
  {
    name: "WhatsApp",
    url: "https://www.whatsapp.com/channel/0029Va78sJa96H4VaQu6580F",
    icon: WhatsappLogo,
    color: "#25D366",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/fmt-news/",
    icon: LinkedinLogo,
    color: "#0A66C2",
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@freemalaysiatoday?_t=8UsJzt8DCWP&_r=1",
    icon: TiktokLogo,
    color: "#FFFFFF",
  },
  {
    name: "Google News",
    url: "https://news.google.com/publications/CAAqBwgKMJ6DqAwwsIu2BA?hl=en-MY&gl=MY&ceid=MY%3Aen",
    icon: Newspaper,
    color: "#4285F4",
  },
] as const;
