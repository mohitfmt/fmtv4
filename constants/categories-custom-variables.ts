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

export const CustomHomeBusinessVariables = {
  where: {
    taxQuery: {
      taxArray: [
        {
          terms: ["business"],
          operator: "AND",
          taxonomy: "CATEGORY",
          field: "SLUG",
        },
      ],
      relation: "AND",
    },
  },
  first: 5,
  after: null,
};

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

export const CustomHomeSportsVariables = {
  first: 100,
  after: null,
  where: {
    taxQuery: {
      taxArray: [
        {
          terms: ["sports"],
          operator: "AND",
          taxonomy: "CATEGORY",
          field: "SLUG",
        },
      ],
      relation: "AND",
    },
    // status: 'PUBLISH', // Add status if needed
  },
};
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

