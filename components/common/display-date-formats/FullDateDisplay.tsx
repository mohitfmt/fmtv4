import React, { useEffect, useState } from "react";
import {
  parseISO,
  format,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  isYesterday,
  isToday,
  isValid,
  startOfDay,
} from "date-fns";
import PopText from "../PopText";

interface FullDateDisplayProps {
  dateString: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  textSize?: "small" | "capital";
  additionalClass?: string;
}

const FullDateDisplay: React.FC<FullDateDisplayProps> = ({
  dateString,
  tooltipPosition = "left",
  textSize = "capital",
  additionalClass,
}) => {
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    if (!dateString) return;

    let date;
    try {
      date = parseISO(dateString);
      if (!isValid(date)) {
        throw new Error("Invalid date format");
      }
    } catch (error) {
      console.error("Error parsing date:", dateString, error);
      setTimeString("Invalid date");
      return;
    }

    const now = new Date();
    const minutesDiff = differenceInMinutes(now, date);
    const hoursDiff = differenceInHours(now, date);
    const daysDiff = differenceInDays(startOfDay(now), startOfDay(date));
    const monthsDiff = differenceInMonths(now, date);
    const yearsDiff = differenceInYears(now, date);

    const getRelativeTime = () => {
      if (isToday(date)) {
        if (minutesDiff < 1) return "Just now";
        if (minutesDiff < 60)
          return `${minutesDiff} ${minutesDiff === 1 ? "min" : "mins"} ago`;
        if (hoursDiff < 24)
          return `${hoursDiff} ${hoursDiff === 1 ? "hour" : "hours"} ago`;
        return `Today at ${format(date, "HH:mm")}`;
      }

      if (isYesterday(date)) return "Yesterday";

      if (daysDiff < 30) return `${daysDiff} days ago`;
      if (monthsDiff < 12)
        return `${monthsDiff} ${monthsDiff === 1 ? "month" : "months"} ago`;
      return `${yearsDiff} ${yearsDiff === 1 ? "year" : "years"} ago`;
    };

    setTimeString(getRelativeTime());
  }, [dateString]);

  if (!dateString) {
    return null;
  }

  let date;
  try {
    date = parseISO(dateString);
    if (!isValid(date)) {
      throw new Error("Invalid date format");
    }
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return <time>Invalid date</time>;
  }

  return (
    <PopText
      content={format(date, "dd MMM yyyy, HH:mm")}
      position={tooltipPosition}
    >
      <time
        className={`font-bitter rounded ${textSize === "small" ? "text-xs" : "uppercase"} + ${additionalClass} `}
        dateTime={date.toISOString()}
        title={format(date, "dd MMM yyyy, HH:mm")}
        itemProp="datePublished"
      >
        {timeString || format(date, "dd-MMM-yyyy, HH:mm")}
      </time>
    </PopText>
  );
};

export default FullDateDisplay;
