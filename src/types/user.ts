
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
