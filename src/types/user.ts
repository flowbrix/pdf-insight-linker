export type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "operator" | "client";
  active: boolean;
};

export type Liaison = {
  id: string;
  name: string;
  active: boolean;
};

export type ClientLiaison = {
  client_id: string;
  liaison_id: string;
};

export type NewUser = {
  email: string;
  first_name: string;
  last_name: string;
  role: "admin" | "operator" | "client";
  liaison_id?: string;
};

export interface Document {
  id: string;
  amorce_number: string | null;
  cuve: string | null;
  section_number: string | null;
  equipment_number: string | null;
  cable_type: string | null;
  fibers: string | null;
  scenario: string | null;
  length_number: string | null;
  metrage: number | null;
  cote: string | null;
  extremite_number: string | null;
  extremite_sup_number: string | null;
  extremite_inf_number: string | null;
  segment: string | null;
  cable_diameter: number | null;
  machine: string | null;
  recette: string | null;
  plan_version: string | null;
  activity_type: string | null;
  plan_type: string | null;
  liaison_id: string | null;
}
