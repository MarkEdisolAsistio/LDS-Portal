export const STAFF_POSITIONS = [
  "LDS Production Assistant",
  "LDS Production Associate",
  "LDS Technical Staff",
  "LDS Graphics Designer",
  "LDS Manager",
  "LDS Assistant Trainee",
] as const;

export type StaffPosition = (typeof STAFF_POSITIONS)[number];
