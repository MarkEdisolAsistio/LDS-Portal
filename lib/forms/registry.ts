// The project lifecycle: every form, in the order a project goes through them.
// Forms without a built definition yet show as "coming soon" on the project page.
export const LIFECYCLE: { stage: string; forms: { code: string; title: string }[] }[] = [
  {
    stage: "Request and approval",
    forms: [
      { code: "F01", title: "Project Request Form" },
      { code: "F02", title: "Project Evaluation and Approval Form" },
    ],
  },
  { stage: "Planning", forms: [{ code: "F03", title: "Design Planning Sheet" }] },
  {
    stage: "Materials and build",
    forms: [
      { code: "F04", title: "Material and Component Requisition Form" },
      { code: "F05", title: "Fabrication Job Order Form" },
    ],
  },
  {
    stage: "Quality and commissioning",
    forms: [
      { code: "F06", title: "Inspection and Testing Checklist" },
      { code: "F07", title: "Test and Validation Report" },
      { code: "F08-1", title: "Commissioning Approval Form" },
    ],
  },
  {
    stage: "Delivery and acceptance",
    forms: [
      { code: "F08", title: "Client Delivery and Acceptance Report" },
      { code: "F09", title: "Delivery Turnover Form" },
      { code: "F10", title: "Client Acceptance Certificate" },
    ],
  },
  {
    stage: "After delivery",
    forms: [
      { code: "F11", title: "Post-Delivery Feedback Form" },
      { code: "F12", title: "Learnware Project Database Entry Form" },
    ],
  },
];
