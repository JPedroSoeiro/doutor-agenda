export const formatPhoneNumber = (phone: string) => {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{0,2})?(\d{0,5})?(\d{0,4})?$/);

  if (!match) return phone;

  const parts = [];
  if (match[1]) parts.push(`(${match[1]}`);
  if (match[2]) parts.push(`) ${match[2]}`);
  if (match[3]) parts.push(`-${match[3]}`);

  return parts.join(" ");
};

export const getSexLabel = (sex: "male" | "female" | "outro") => {
  if (sex === "male") {
    return "Masculino";
  }
  if (sex === "female") {
    return "Feminino";
  }
  if (sex === "outro") {
    return "Outro";
  }
  return sex;
};
