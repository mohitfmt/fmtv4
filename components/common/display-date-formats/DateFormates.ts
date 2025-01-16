import { parseISO, addHours, format } from 'date-fns'

const formatUTCDate = (
  dateString: string,
  formatString: string,
  addHoursFlag: boolean = true,
): string => {
  try {
    if (!dateString) {
      const nowUTC = addHours(new Date(), 8)
      return format(nowUTC, formatString)
    }
    const parsedDate = parseISO(dateString)
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date - ${dateString}, parsedDate: ${parsedDate}`)
    }
    const utcDate = addHoursFlag ? addHours(parsedDate, 8) : parsedDate
    return format(utcDate, formatString)
  } catch (error) {
    console.error(error)
    const nowUTC = addHours(new Date(), 8)
    return format(nowUTC, formatString)
  }
}

export const formattedDate = (
  dateString: string,
  addHoursFlag: boolean = true,
): string => {
  return formatUTCDate(dateString, 'yyyy-MM-dd HH:mm', addHoursFlag)
}

export const formattedJsonDate = (
  dateString: string,
  addHoursFlag: boolean = true,
): string => {
  return formatUTCDate(dateString, "yyyy-MM-dd'T'HH:mm:ss+08:00", addHoursFlag)
}

export const formattedDisplayDate = (
  dateString: string,
  addHoursFlag: boolean = false,
): string => {
  return formatUTCDate(dateString, 'dd MMM yyyy, hh:mm aa', addHoursFlag)
}
