# Weekly staff reports setup

1. Open Supabase SQL Editor and run `sql/16_weekly_staff_reports.sql`.
2. In Admin > Users and Roles, give staff `Reports and Export` permission level `Edit`.
3. Give supervisors or the Super Admin `Reports and Export` permission level `Full` to see and review every staff report.
4. Open Admin > Reports and Export > Weekly Staff Reports.

The native form matches the LDS Weekly Activity and Expense Log:

- staff member and Monday week covered
- activities/tasks completed
- activity categories and other category
- total expenses and expense breakdown
- up to five private receipt files, 10 MB each
- remarks/concerns

Receipts are stored in the private `weekly-report-receipts` Supabase Storage bucket and are opened through temporary signed links. Each submission, update, review, and return is written to the Audit Log.
