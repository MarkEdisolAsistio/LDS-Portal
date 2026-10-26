import type { FormDef } from "./types";

const F01: FormDef = {
  code: "F01",
  number: "LDS – FRM - 001",
  title: "Project Request Form",
  revision: "0",
  effective: "10 Oct., 2025",
  syncTitleKey: "title",
  purpose: [
    "To formally request the design and/or fabrication of a learnware, teachware, or related service from the LDS Department. This form captures essential details to evaluate project feasibility, timeline, and resource requirements.",
    "Used by both internal clients (ITD–TTAP, ITD–Formal) and external clients (schools, industries, or partner institutions).",
  ],
  sections: [
    {
      title: "A. Client Information",
      fields: [
        { key: "clientType", label: "Client Type", type: "radio", options: ["Internal", "External"], prefill: "clientType" },
        { key: "clientOrg", label: "Department / Company", type: "text", prefill: "clientOrg" },
        { key: "contactPerson", label: "Contact Person", type: "text", prefill: "contactPerson" },
        { key: "designation", label: "Designation", type: "text" },
        { key: "contactInfo", label: "Contact No. / Email", type: "text", prefill: "contactInfo" },
        { key: "dateRequest", label: "Date of Request", type: "date", prefill: "today" },
      ],
    },
    {
      title: "B. Project Information",
      fields: [
        { key: "title", label: "Project Title / Learnware Name", type: "text", prefill: "title" },
        { key: "requestType", label: "Type of Request", type: "checks", options: ["New Design", "Modification", "Replication", "Repair"] },
        { key: "description", label: "Description / Objective", type: "textarea", rows: 5 },
        { key: "audience", label: "Intended Users / Audience", type: "text" },
        {
          key: "appArea",
          label: "Application Area",
          type: "checks",
          options: ["Electrical", "Electronics", "Automation", "Mechanical", "Automotive"],
          other: "Others",
        },
      ],
    },
    {
      title: "C. Required Deliverables",
      fields: [
        {
          key: "deliverables",
          label: "Required Deliverables",
          type: "checks",
          stack: true,
          options: [
            "Learnware / Teachware Equipment",
            "Teacher's Guide / Manual",
            "Presentation Materials",
            "Student Lab Manual",
            "Installation / Setup",
          ],
          other: "Others (specify)",
        },
      ],
    },
    {
      title: "D. Project Schedule",
      fields: [
        { key: "startDate", label: "Target Start Date", type: "date" },
        { key: "endDate", label: "Target Completion Date", type: "date" },
        { key: "urgency", label: "Urgency Level", type: "radio", options: ["Normal", "Priority", "Rush"] },
      ],
    },
    {
      title: "E. Additional Notes / Special Instructions",
      fields: [{ key: "notes", label: "Additional Notes / Special Instructions", type: "textarea", rows: 5, full: true }],
    },
    {
      title: "F. Approval Routing",
      signatures: ["Requested by", "Verified by (LDS Associate)", "Approved by (LDS Manager)"],
    },
  ],
  notes: [
    "Internal clients must submit this form to the LDS Associate (digital or printed).",
    "External clients may submit via email or client request letter attached to this form.",
    "Once approved by the LDS Manager, the request proceeds to LDS-F02 Project Evaluation and Approval Form.",
  ],
};

const F02: FormDef = {
  code: "F02",
  number: "LDS – FRM - 002",
  title: "Project Evaluation and Approval Form",
  revision: "0",
  effective: "10 Oct., 2025",
  purpose: [
    "To evaluate and document the technical, financial, and schedule feasibility of the proposed learnware or service project before approval. This form ensures that all project requests (from internal or external clients) are reviewed for resource availability, design capability, and institutional alignment prior to implementation.",
  ],
  sections: [
    {
      title: "A. Project Identification",
      fields: [
        { key: "refNo", label: "Reference No. (LDS-F01 Ref)", type: "text", prefill: "projectCode" },
        { key: "title", label: "Project Title", type: "text", prefill: "title" },
        { key: "clientOrg", label: "Requesting Client / Department", type: "text", prefill: "clientOrg" },
        { key: "clientType", label: "Type of Client", type: "radio", options: ["Internal", "External"], prefill: "clientType" },
        { key: "evalDate", label: "Date of Evaluation", type: "date", prefill: "today" },
        { key: "evaluatedBy", label: "Evaluated by (LDS Associate)", type: "text" },
      ],
    },
    {
      title: "B. Technical Evaluation",
      fields: [
        { key: "nature", label: "Nature of Work", type: "checks", options: ["New Design", "Modification", "Fabrication", "Repair"] },
        {
          key: "techArea",
          label: "Required Technology Area",
          type: "checks",
          options: ["Electrical", "Electronics", "Automation", "Mechanical", "IT"],
          other: "Others",
        },
        { key: "techSummary", label: "Technical Requirements Summary", type: "textarea", rows: 4 },
        { key: "complexity", label: "Design Complexity", type: "radio", options: ["Low", "Medium", "High"] },
        {
          key: "availability",
          label: "Availability of Components",
          type: "checks",
          options: ["Readily Available", "To be Procured", "Requires Custom Fabrication"],
        },
        { key: "compatibility", label: "Compatibility with Existing Systems", type: "radio", options: ["Yes", "No", "Not Applicable"] },
        { key: "safety", label: "Safety / Standards Compliance", type: "radio", options: ["Meets Standards", "Requires Review", "Not Applicable"] },
      ],
    },
    {
      title: "C. Resource Evaluation",
      fields: [
        { key: "manpower", label: "Estimated Manpower", hint: "No. of personnel / hours", type: "text" },
        { key: "skills", label: "Required Skills / Expertise", type: "textarea", rows: 3 },
        { key: "equipment", label: "Equipment / Tools Needed", type: "textarea", rows: 3 },
        { key: "materialsCost", label: "Materials / Components Estimated Cost", type: "money" },
        { key: "otherExpenses", label: "Other Expenses (e.g., Printing, Delivery)", type: "money" },
      ],
    },
    {
      title: "D. Project Duration and Schedule",
      fields: [
        { key: "proposedStart", label: "Proposed Start Date", type: "date" },
        { key: "proposedEnd", label: "Proposed Completion Date", type: "date" },
        { key: "duration", label: "Total Estimated Duration", hint: "e.g. 3 weeks", type: "text" },
      ],
    },
    {
      title: "E. Evaluation Summary",
      fields: [
        { key: "feasibility", label: "Feasibility Status", type: "radio", options: ["Feasible", "Conditionally Feasible", "Not Feasible"] },
        { key: "recommendation", label: "Recommendation", type: "textarea", rows: 3 },
        { key: "remarks", label: "Remarks", type: "textarea", rows: 3 },
      ],
    },
    {
      title: "F. Approval Routing (For internal clients only; external clients skip this step)",
      signatures: ["Evaluated by (LDS Associate)", "Reviewed by (LDS Manager)", "Approved by (TTAP / Formal Head)"],
    },
  ],
  notes: [
    "This form is accomplished after the Project Request Form (LDS-F01) has been received.",
    "The LDS Associate fills out the technical and resource evaluation details.",
    "The LDS Manager reviews and recommends the project for approval.",
    "Approved projects proceed to LDS–F03: Design Planning Sheet for project execution planning.",
  ],
};

const F03: FormDef = {
  code: "F03",
  number: "LDS – FRM - 003",
  title: "Design Planning Sheet",
  revision: "0",
  effective: "10 Oct., 2025",
  purpose: [
    "To define the technical plan, design concept, objectives, resources, and schedule for a learnware or teachware project approved for development. This form serves as the project blueprint and reference during design, fabrication, and testing.",
  ],
  sections: [
    {
      title: "A. Project Information",
      fields: [
        { key: "refNo", label: "Project Reference No. (LDS-F02 Ref)", type: "text", prefill: "projectCode" },
        { key: "title", label: "Project Title", type: "text", prefill: "title" },
        { key: "clientOrg", label: "Requesting Client / Department", type: "text", prefill: "clientOrg" },
        { key: "clientType", label: "Client Type", type: "radio", options: ["Internal", "External"], prefill: "clientType" },
        {
          key: "projectType",
          label: "Project Type",
          type: "checks",
          options: ["Learnware", "Teachware", "Laboratory Trainer", "Simulation Module"],
          other: "Others",
        },
        { key: "lead", label: "Project Lead / Designer", type: "text" },
        { key: "team", label: "Design Team Members", type: "textarea", rows: 3 },
        { key: "planDate", label: "Date of Planning", type: "date", prefill: "today" },
      ],
    },
    {
      title: "B. Project Objectives and Scope",
      fields: [
        { key: "objectives", label: "Learning Objectives / Outcomes", type: "textarea", rows: 4 },
        { key: "scope", label: "Scope of Design", type: "radio", options: ["Concept Only", "Prototype", "Complete System"] },
        { key: "functions", label: "Functions to be Incorporated", type: "textarea", rows: 4 },
        { key: "level", label: "Target Learner Level", type: "checks", options: ["Senior High", "DTS", "College", "Industry / Professional"] },
      ],
    },
    {
      title: "C. Design Specifications",
      fields: [
        { key: "electrical", label: "Electrical Requirements", type: "textarea", rows: 3 },
        { key: "electronics", label: "Electronic / Control Components", type: "textarea", rows: 3 },
        { key: "software", label: "Software / Programming", type: "textarea", rows: 3 },
        { key: "mechanical", label: "Mechanical / Structural Details", type: "textarea", rows: 3 },
        { key: "dimensions", label: "Dimensions / Layout Sketch (Attach Drawing)", type: "textarea", rows: 3 },
        { key: "safetyFeatures", label: "Safety Features / Standards", type: "textarea", rows: 3 },
      ],
    },
    {
      title: "D. Resources and Materials Planning",
      fields: [
        { key: "components", label: "Major Components / Materials Needed", type: "textarea", rows: 4 },
        { key: "materialCost", label: "Estimated Material Cost", type: "money" },
        { key: "laborCost", label: "Estimated Labor Cost", type: "money" },
        { key: "tools", label: "Tools / Equipment Required", type: "textarea", rows: 3 },
        {
          key: "sourcing",
          label: "Sourcing / Procurement Plan",
          type: "checks",
          stack: true,
          options: ["In-stock", "To Purchase", "To Fabricate", "Client-supplied"],
        },
      ],
    },
    {
      title: "E. Documentation and Learning Materials",
      fields: [
        {
          key: "supporting",
          label: "Required Supporting Materials",
          type: "checks",
          stack: true,
          options: ["Teacher’s Guide", "Student Manual", "Lab Activity Sheets", "PowerPoint", "User Manual"],
          other: "Others",
        },
        { key: "writer", label: "Assigned Writer / Developer", type: "text" },
        { key: "reviewer", label: "Reviewer", type: "text" },
      ],
    },
    {
      title: "F. Project Schedule and Milestones",
      fields: [
        {
          key: "schedule",
          label: "Project Schedule and Milestones",
          type: "table",
          labelHeader: "Activity",
          rowLabels: [
            "Design Concept and Draft",
            "Drawing and Documentation",
            "Material Procurement",
            "Fabrication and Assembly",
            "Testing and Calibration",
            "Documentation and Final Review",
            "Client Demonstration / Turnover",
          ],
          columns: [{ key: "start", label: "Start Date", type: "date" }],
        },
      ],
    },
    {
      title: "G. Approval and Endorsement",
      signatures: [
        "Prepared by (LDS Associate / Designer)",
        "Reviewed by (LDS Manager)",
        "Approved by (Client / Department Head)",
      ],
    },
  ],
  notes: [
    "The Design Planning Sheet is completed after project evaluation and approval (LDS-F02).",
    "It serves as the master planning record for all subsequent activities: material requisition (F04), fabrication (F05), and inspection (F06).",
    "Any change during the design phase must be recorded using LDS–F10: Design Change Request Form.",
  ],
};

export const FORMS: Record<string, FormDef> = { F01, F02, F03 };

export function getFormDef(code: string): FormDef | null {
  return Object.prototype.hasOwnProperty.call(FORMS, code) ? FORMS[code] : null;
}
