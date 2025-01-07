export const CustomHomeNewsExcludeVariables = [
  {
    first: 5,
    status: "PUBLISH",
    taxQuery: {
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: ["top-news"],
        },
      ],
      relation: "AND",
    },
  },
];

export const CustomHomeBeritaExcludeVariables = [
  {
    first: 1,
    status: "PUBLISH",
    taxQuery: {
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: ["super-bm"],
        },
      ],
      relation: "AND",
    },
  },
  {
    first: 4,
    status: "PUBLISH",
    taxQuery: {
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: ["top-bm"],
        },
      ],
      relation: "AND",
    },
  },
];

export const CustomHomeBusinessExcludeVariables = [
  {
    first: 5,
    status: "PUBLISH",
    taxQuery: {
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: ["business"],
        },
      ],
      relation: "AND",
    },
  },
];

export const CustomHomeLifestyleExcludeVariables = [
  {
    first: 1,
    status: "PUBLISH",
    taxQuery: {
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: ["top-lifestyle"],
        },
      ],
      relation: "AND",
    },
  },
  {
    first: 4,
    status: "PUBLISH",
    taxQuery: {
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: ["leisure"],
        },
      ],
      relation: "AND",
    },
  },
];

export const CustomHomeOpinionExcludeVariables = [
  {
    first: 5,
    status: "PUBLISH",
    taxQuery: {
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: ["opinion"],
        },
      ],
      relation: "AND",
    },
  },
];

export const CustomHomeSportsExcludeVariables = [
  {
    first: 5,
    status: "PUBLISH",
    taxQuery: {
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: ["sports"],
        },
      ],
      relation: "AND",
    },
  },
];

export const CustomHomeWorldExcludeVariables = [
  {
    first: 5,
    status: "PUBLISH",
    taxQuery: {
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: ["world"],
        },
      ],
      relation: "AND",
    },
  },
];
