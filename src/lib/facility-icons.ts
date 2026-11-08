export const facilityIcons = [
  {value:"building", label:"Edificio"}, {value:"court", label:"Cancha"},
  {value:"dance", label:"Danza"}, {value:"theatre", label:"Teatro"},
  {value:"pool", label:"Piscina"}, {value:"gym", label:"Gimnasio"},
  {value:"library",label:"Biblioteca"}, {value:"cafe",label:"Cafetería"},
  {value:"garden",label:"Jardín"}, {value:"studio", label:"Sala de actividades"}
];
export function validFacilityIcon(value: unknown) {
  return facilityIcons.some(icon => icon.value === value);
}
