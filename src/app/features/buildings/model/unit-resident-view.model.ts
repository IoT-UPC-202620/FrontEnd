export interface UnitResidentView {
  unitId: number;
  unitNumber: number;
  tower: string;
  unitStatus: string;
  floor: number;
  totalArea: number;

  residentId?: number;
  residentName: string;
  residentRole: string;
  email: string;
  phone: string;

  debtStatus: 'PAID' | 'LATE' | 'N/A';
  debtLabel: string;

  /**
   * Vínculos en estado FAILED del backstop (E2/E3) para esta unidad,
   * mostrados junto a los ACTIVE con su motivo.
   */
  failedLinks: Array<{
    residentEmail: string | null;
    reason: string | null;
  }>;
}
