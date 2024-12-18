import { nanoid } from "nanoid";

export const navigation = [
  {
    id: 1,
    title: `Home`,
    href: `/?${nanoid()}`,
  },
  {
    id: 2,
    title: "News",
    href: "/news/",
    items: [
      {
        id: 21,
        title: "Malaysia",
        href: "/news/malaysia/",
      },
      {
        id: 22,
        title: "Borneo+",
        href: "/news/borneo/",
      },
    ],
  },
  {
    id: 3,
    title: "Berita",
    href: "/berita/",
    items: [
      {
        id: 31,
        title: "Tempatan",
        href: "/berita/tempatan/",
      },
      {
        id: 32,
        title: "Pandangan",
        href: "/berita/pandangan/",
      },
      {
        id: 33,
        title: "Dunia",
        href: "/berita/dunia/",
      },
    ],
  },
  {
    id: 4,
    title: "Business",
    href: "/business/",
    items: [
      {
        id: 41,
        title: "Local Business",
        href: "/business/local/",
      },
      {
        id: 42,
        title: "World Business",
        href: "/business/world/",
      },
    ],
  },
  {
    id: 5,
    title: "Lifestyle",
    href: "/lifestyle/",
    items: [
      {
        id: 51,
        title: "Simple Stories",
        href: "/lifestyle/simple-stories/",
      },
      {
        id: 52,
        title: "Travel",
        href: "/lifestyle/travel/",
      },
      {
        id: 53,
        title: "Food",
        href: "/lifestyle/food/",
      },
      {
        id: 54,
        title: "Entertainment",
        href: "/lifestyle/entertainment/",
      },
      {
        id: 55,
        title: "Money",
        href: "/lifestyle/money/",
      },
      {
        id: 56,
        title: "Health & Family",
        href: "/lifestyle/health-family/",
      },
      {
        id: 57,
        title: "Pets",
        href: "/lifestyle/pets/",
      },
      {
        id: 58,
        title: "Tech",
        href: "/lifestyle/tech/",
      },
      {
        id: 59,
        title: "Automotive",
        href: "/lifestyle/automotive/",
      },
    ],
  },
  {
    id: 6,
    title: "Opinion",
    href: "/opinion/",
    items: [
      {
        id: 61,
        title: "Column",
        href: "/opinion/column/",
      },
      {
        id: 62,
        title: "Editorial",
        href: "/opinion/editorial/",
      },
      {
        id: 63,
        title: "Letters",
        href: "/opinion/letters/",
      },
      {
        id: 64,
        title: "FMT Worldviews",
        href: "/opinion/worldviews/",
      },
    ],
  },
  {
    id: 7,
    title: "Sports",
    href: "/sports/",
    items: [
      {
        id: 71,
        title: "Football",
        href: "/sports/football/",
      },
      {
        id: 72,
        title: "Badminton",
        href: "/sports/badminton/",
      },
      {
        id: 73,
        title: "Motorsports",
        href: "/sports/motorsports/",
      },
      {
        id: 74,
        title: "Tennis",
        href: "/sports/tennis/",
      },
    ],
  },
  {
    id: 8,
    title: "World",
    href: "/world/",
    items: [
      {
        id: 81,
        title: "Southeast Asia",
        href: "/world/southeast-asia/",
      },
    ],
  },
  {
    id: 9,
    title: "Property",
    href: "/property/",
  },
  {
    id: 10,
    title: "Education",
    href: "/education/",
  },
  {
    id: 11,
    title: "Videos",
    href: "/videos/",
  },
  {
    id: 12,
    title: "Gallery",
    href: "/gallery/",
  },
  {
    id: 13,
    title: "Carzilla",
    href: "/lifestyle/automotive/",
  },
  {
    id: 14,
    title: "Accelerator",
    href: "/accelerator/",
  },
];
