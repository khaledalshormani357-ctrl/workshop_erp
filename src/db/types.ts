// ========== Project Types ==========

export type ProjectStatus = 'open' | 'in_progress' | 'completed' | 'closed';

export interface Project {
  id: string;
  tenant_id: string;
  customer_id: string;
  name: string;
  name_ar?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: ProjectStatus;
  sync_status: string;
  sync_version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ========== Measurement Types ==========

export interface Measurement {
  id: string;
  tenant_id: string;
  customer_id?: string | null;
  project_id?: string | null;
  production_order_id?: string | null;
  location?: string;
  width?: number;
  height?: number;
  quantity: number;
  thickness?: number;
  profile_type?: string;
  color?: string;
  glass_type?: string;
  accessories?: string;
  opening_direction?: string;
  notes?: string;
  version: number;
  measured_by?: string;
  measured_at?: string;
  sync_status: string;
  sync_version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface MeasurementVersion {
  id: string;
  tenant_id: string;
  measurement_id: string;
  version: number;
  width?: number;
  height?: number;
  quantity: number;
  thickness?: number;
  profile_type?: string;
  color?: string;
  glass_type?: string;
  accessories?: string;
  opening_direction?: string;
  notes?: string;
  measured_by?: string;
  measured_at?: string;
  created_at: string;
}

export interface MeasurementImage {
  id: string;
  tenant_id: string;
  measurement_id: string;
  file_path: string;
  file_name?: string | null;
  mime_type?: string | null;
  is_primary: number;
  uploaded_by?: string | null;
  created_at: string;
  sync_status: string;
  sync_version: number;
}

// ========== Quotation Types ==========

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';

export interface Quotation {
  id: string;
  tenant_id: string;
  customer_id: string;
  project_id?: string | null;
  quotation_number?: string;
  revision: number;
  status: QuotationStatus;
  date: string;
  valid_until?: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes?: string;
  sync_status: string;
  sync_version: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface QuotationItem {
  id: string;
  tenant_id: string;
  quotation_id: string;
  product_id?: string | null;
  description?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  total: number;
  line_order: number;
}

export interface QuotationRevision {
  id: string;
  tenant_id: string;
  quotation_id: string;
  revision: number;
  status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes?: string;
  created_at: string;
}
