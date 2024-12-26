export const stripHTML = (htmlString: string) =>
  htmlString?.replace(/<\/?[^>]+(>|$)|\n/g, '').trim()