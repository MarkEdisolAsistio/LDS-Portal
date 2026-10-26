// How a form is described. Forms are DATA, so one screen can show and print any of them.

// Where a field's starting value comes from when the form is first opened.
export type Prefill =
  | "projectCode"
  | "title"
  | "clientOrg"
  | "clientType"
  | "contactPerson"
  | "contactInfo"
  | "today";

export type Column = {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "money";
};

type Base = { key: string; label: string; hint?: string };

export type TextField = Base & {
  type: "text" | "email" | "date" | "money" | "number";
  prefill?: Prefill;
};

export type AreaField = Base & {
  type: "textarea";
  rows?: number;
  // true = a wide empty box under the section bar, with no label (like "Additional Notes")
  full?: boolean;
};

export type ChoiceField = Base & {
  type: "radio" | "checks"; // radio = pick one, checks = pick any
  options: string[];
  other?: string; // adds a final "Others: ____" choice with a text box, e.g. "Others"
  stack?: boolean; // print the choices one per line
  prefill?: Prefill;
};

export type TableField = Base & {
  type: "table";
  columns: Column[];
  // Fixed first column (e.g. the milestone names). When set, the number of rows is fixed.
  rowLabels?: string[];
  labelHeader?: string;
  minRows?: number;
  maxRows?: number;
};

export type Field = TextField | AreaField | ChoiceField | TableField;

export type Section = {
  title: string;
  fields?: Field[];
  // Roles that sign the printed form by hand. Shown as blank lines on the printout only.
  signatures?: string[];
};

export type FormDef = {
  code: string; // e.g. "F01"
  number: string; // printed Form No
  title: string;
  revision: string;
  effective: string;
  purpose: string[];
  sections: Section[];
  notes: string[];
  // When this field is saved, copy it to the project title.
  syncTitleKey?: string;
};
