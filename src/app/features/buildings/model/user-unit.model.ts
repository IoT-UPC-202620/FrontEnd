export interface UserUnit {
  id?: number;
  idUserUnit?: number;
  idBuilding?: number;
  idUnit: number;
  /** Null en vínculos PENDIENTE (el usuario lo crea IAM tras el evento). */
  idUser: number | null;
  startDate: string;
  endDate: string | null;
  status: string;
  relationType?: string;
  residentEmail?: string | null;
  /** Motivo del vínculo FAILED (backstop E2/E3), p. ej. «El correo ya está registrado». Mapea UserUnitResource.failureReason del backend. */
  failureReason?: string | null;
}
