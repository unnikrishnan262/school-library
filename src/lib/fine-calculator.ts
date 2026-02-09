import prisma from "./prisma";

export async function calculateFine(
  dueDate: Date,
  returnDate: Date
): Promise<number> {
  const finePerDaySetting = await prisma.settings.findUnique({
    where: { key: "fine_per_day" },
  });
  const gracePeriodSetting = await prisma.settings.findUnique({
    where: { key: "grace_period_days" },
  });
  const maxFineSetting = await prisma.settings.findUnique({
    where: { key: "max_fine_per_book" },
  });

  const finePerDay = parseFloat(finePerDaySetting?.value ?? "1");
  const gracePeriod = parseInt(gracePeriodSetting?.value ?? "0");
  const maxFine = maxFineSetting?.value ? parseFloat(maxFineSetting.value) : null;

  const due = new Date(dueDate);
  const returned = new Date(returnDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLate = Math.floor((returned.getTime() - due.getTime()) / msPerDay);

  if (daysLate <= gracePeriod) return 0;

  const chargeableDays = daysLate - gracePeriod;
  const fine = chargeableDays * finePerDay;

  if (maxFine !== null) {
    return Math.min(fine, maxFine);
  }

  return fine;
}
