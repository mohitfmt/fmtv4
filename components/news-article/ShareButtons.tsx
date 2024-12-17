import { FaShareAlt } from "react-icons/fa";
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  LinkedinShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  LinkedinIcon,
  PinterestShareButton,
  PinterestIcon,
  FacebookMessengerIcon,
  FacebookMessengerShareButton,
  RedditShareButton,
  RedditIcon,
  TelegramShareButton,
  TelegramIcon,
  EmailShareButton,
  EmailIcon,
} from "react-share";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  url: string;
  title: string;
  mediaUrl: string;
  hashs: string[];
}

type ShareOptionType = {
  name: string;
  Button: React.ComponentType<any>;
  Icon: React.ComponentType<any>;
  getProps: (args: ShareButtonProps) => Record<string, any>;
};

const createXHashtag = (phrase: string | undefined | null): string => {
  if (!phrase || typeof phrase !== "string") return "";

  try {
    const words = phrase.replace(/[^\w\s]/gi, "").split(/\s+/);
    const hashtag = words
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join("");
    return hashtag;
  } catch (error) {
    console.warn(`Error creating hashtag from phrase: ${phrase}`, error);
    return "";
  }
};

const ShareButton: React.FC<ShareButtonProps> = ({
  url,
  title,
  mediaUrl,
  hashs = [], // Provide default empty array
}) => {
  // Filter out non-string values and create hashtags
  const xHashTags = hashs
    .filter((hash): hash is string => typeof hash === "string")
    .map(createXHashtag)
    .filter(Boolean); // Remove any empty strings

  const getShareText = (platform: string) =>
    `Share this article "${title}" on ${platform}`;

  const shareOptions: ShareOptionType[] = [
    {
      name: "Facebook",
      Button: FacebookShareButton,
      Icon: FacebookIcon,
      getProps: () => ({ hashtag: "#FMT" }),
    },
    {
      name: "Messenger",
      Button: FacebookMessengerShareButton,
      Icon: FacebookMessengerIcon,
      getProps: () => ({ appId: "193538481218906" }),
    },
    {
      name: "Twitter",
      Button: TwitterShareButton,
      Icon: TwitterIcon,
      getProps: () => ({ hashtags: xHashTags }),
    },
    {
      name: "WhatsApp",
      Button: WhatsappShareButton,
      Icon: WhatsappIcon,
      getProps: () => ({}),
    },
    {
      name: "LinkedIn",
      Button: LinkedinShareButton,
      Icon: LinkedinIcon,
      getProps: () => ({}),
    },
    {
      name: "Email",
      Button: EmailShareButton,
      Icon: EmailIcon,
      getProps: () => ({ subject: title }),
    },
    {
      name: "Pinterest",
      Button: PinterestShareButton,
      Icon: PinterestIcon,
      getProps: () => ({ media: mediaUrl, description: title }),
    },
    {
      name: "Reddit",
      Button: RedditShareButton,
      Icon: RedditIcon,
      getProps: () => ({}),
    },
    {
      name: "Telegram",
      Button: TelegramShareButton,
      Icon: TelegramIcon,
      getProps: () => ({}),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto border-[0.5px]">
          <FaShareAlt className="mr-2 h-4 w-4" /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40 p-2 dark:border-stone-600">
        {shareOptions.map(({ name, Button, Icon, getProps }) => (
          <DropdownMenuItem key={name} asChild>
            <Button
              url={url}
              title={title}
              {...getProps({ url, title, mediaUrl, hashs })}
              className="flex items-center cursor-pointer hover:bg-accent/50 transition-colors gap-3"
              aria-label={getShareText(name)}
            >
              <Icon size={32} round  />
              <span>{name}</span>
            </Button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareButton;
