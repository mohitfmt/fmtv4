import { parseISO, addHours, format } from "date-fns";

const formatUTCDate = (
  dateString: string,
  formatString: string,
  addHoursFlag: boolean = true
): string => {
  try {
    if (!dateString) {
      const nowUTC = addHours(new Date(), 8);
      return format(nowUTC, formatString);
    }
    const parsedDate = parseISO(dateString);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(
        `Invalid date - ${dateString}, parsedDate: ${parsedDate}`
      );
    }
    const utcDate = addHoursFlag ? addHours(parsedDate, 8) : parsedDate;
    return format(utcDate, formatString);
  } catch (error) {
    console.error(error);
    const nowUTC = addHours(new Date(), 8);
    return format(nowUTC, formatString);
  }
};

export const formattedDate = (
  dateString: string,
  addHoursFlag: boolean = true
): string => {
  return formatUTCDate(dateString, "yyyy-MM-dd HH:mm", addHoursFlag);
};

export const formattedJsonDate = (
  dateString: string,
  addHoursFlag: boolean = true
): string => {
  return formatUTCDate(dateString, "yyyy-MM-dd'T'HH:mm:ss+08:00", addHoursFlag);
};

export const formattedDisplayDate = (
  dateString: string,
  addHoursFlag: boolean = false
): string => {
  return formatUTCDate(dateString, "dd MMM yyyy, hh:mm aa", addHoursFlag);
};

export const formatMalaysianDate = (
  gmtDateString: string,
  includeTime = true
) => {
  const date = new Date(gmtDateString);
  // Create Malaysian date (UTC+8)
  const malaysianDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  if (includeTime) {
    return malaysianDate.toISOString();
  } else {
    // Format as YYYY-MM-DD for date-only
    return malaysianDate.toISOString().split("T")[0];
  }
};

// Function to display time in 24-hour format (Malaysian time)
export const formatMalaysianTime24h = (gmtDateString: string) => {
  const date = new Date(gmtDateString);
  // Create Malaysian date (UTC+8)
  const malaysianDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  // Format the time in 24-hour format
  const hours = malaysianDate.getUTCHours().toString().padStart(2, "0");
  const minutes = malaysianDate.getUTCMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes}`;
};

export const convertGMTtoMYT = (gmtDateString:string) => {
  // Parse the GMT date string
  const date = new Date(gmtDateString);

  // Add 8 hours to convert GMT to Malaysian time (UTC+8)
  const malaysianDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  // Format in ISO format but with +08:00 timezone
  const year = malaysianDate.getUTCFullYear();
  const month = (malaysianDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = malaysianDate.getUTCDate().toString().padStart(2, "0");
  const hours = malaysianDate.getUTCHours().toString().padStart(2, "0");
  const minutes = malaysianDate.getUTCMinutes().toString().padStart(2, "0");
  const seconds = malaysianDate.getUTCSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
};


 