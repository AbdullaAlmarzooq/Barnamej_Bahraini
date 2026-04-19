function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

function parseBirthdateParts(birthdate: string | Date) {
  if (birthdate instanceof Date) {
    return {
      year: birthdate.getFullYear(),
      month: birthdate.getMonth() + 1,
      day: birthdate.getDate(),
    };
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function parseDateOnlyString(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatDateForDatabase(date: Date) {
  const year = `${date.getFullYear()}`;
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function calculateAgeFromBirthdate(
  birthdate: string | Date,
  timeZone = getUserTimeZone()
) {
  const birthdateParts = parseBirthdateParts(birthdate);
  if (!birthdateParts) {
    return null;
  }

  const today = getTimeZoneDateParts(new Date(), timeZone);
  let age = today.year - birthdateParts.year;
  const birthdayHasPassed =
    today.month > birthdateParts.month ||
    (today.month === birthdateParts.month && today.day >= birthdateParts.day);

  if (!birthdayHasPassed) {
    age -= 1;
  }

  if (age < 1 || age > 120) {
    return null;
  }

  return age;
}

export function formatBirthdayForDisplay(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';

  return `${day}/${month}/${year}`;
}
