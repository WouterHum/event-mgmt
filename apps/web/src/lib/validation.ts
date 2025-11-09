export const requiredFields = {
  attendee: ["name", "email"],
  speaker: ["name", "email"],
  upload: ["event_id", "speaker_id", "files"],
};

export function validateFields<T extends object>(
  fields: T,
  required: (keyof T)[]
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const field of required) {
    const value = fields[field];
    if (
      value === undefined ||
      value === null ||
      value.toString().trim() === ""
    ) {
      const fieldName =
        String(field).charAt(0).toUpperCase() + String(field).slice(1);
      errors[field] = `${fieldName} is required`;
    }
  }
  return errors;
}
