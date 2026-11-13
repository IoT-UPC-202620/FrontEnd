export interface SignUpResource {
  fullName: string;
  email: string;
  password?: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  roles: string[];
}
