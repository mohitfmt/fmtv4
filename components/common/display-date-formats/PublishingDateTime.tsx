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
} from "date-fns";
import PopText from "../PopText";

interface PublishingDateTimeProps {
  dateString: string;
  size?: number;
  isTextPop?: boolean;
}

const PublishingDateTime = ({
  dateString,
  isTextPop = true,
}: PublishingDateTimeProps) => {
  const [timeString, setTimeString] = useState("");
  const [tooltipString, setTooltipString] = useState("");

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
    const daysDiff = differenceInDays(now, date);
    const monthsDiff = differenceInMonths(now, date);
    const yearsDiff = differenceInYears(now, date);

    const getRelativeTime = () => {
      if (minutesDiff < 3) return "Just now";
      if (minutesDiff < 60) return `${minutesDiff} minutes ago`;
      if (hoursDiff < 24)
        return `${hoursDiff} ${hoursDiff === 1 ? "hour" : "hours"} ago`;
      if (isToday(date)) return `Today at ${format(date, "HH:mm")}`;
      if (isYesterday(date)) return `Yesterday at ${format(date, "HH:mm")}`;
      if (daysDiff < 30)
        return `${daysDiff} ${daysDiff === 1 ? "day" : "days"} ago`;
      if (monthsDiff < 12)
        return `${monthsDiff} ${monthsDiff === 1 ? "month" : "months"} ago`;
      return `${yearsDiff} ${yearsDiff === 1 ? "year" : "years"} ago`;
    };

    const relativeTime = getRelativeTime();
    const formattedTime = format(date, "HH:mm");
    const fullDateTime = format(date, "dd-MMM-yyyy, HH:mm");

    setTimeString(formattedTime);
    setTooltipString(`${relativeTime}<br>${fullDateTime}`);
  }, [dateString]);

  if (!dateString) {
    return null;
  }

  const content = (
    <>
      <div className={`max-w-20 text-center text-md`}>{timeString}</div>
      <time className="hidden" dateTime={parseISO(dateString).toISOString()}>
        {timeString}
      </time>
    </>
  );

  return isTextPop ? (
    <PopText content={tooltipString} position="left" isHtml={true}>
      {content}
    </PopText>
  ) : (
    content
  );
};

export default PublishingDateTime;
