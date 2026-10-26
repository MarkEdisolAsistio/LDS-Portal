// Styles for the printed form. Plain CSS (not Tailwind) so the printout is the same
// everywhere. Colours and layout follow the LDS Word forms.
export const PRINT_CSS = `
.lf-sheet{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;font-size:10.5px;line-height:1.3;max-width:794px;margin:0 auto;padding:28px 30px;box-shadow:0 1px 8px rgba(0,0,0,.18)}
.lf-sheet *{box-sizing:border-box}
.lf-head{width:100%;border-collapse:collapse;margin:0 0 16px}
.lf-head td{border:1px solid #000;padding:0;vertical-align:middle}
.lf-logo{width:96px;text-align:center;padding:6px!important}
.lf-logo img{display:block;margin:0 auto;height:70px;width:auto}
.lf-title{text-align:center;font-size:21px;font-weight:700;padding:8px!important}
.lf-meta{width:160px}
.lf-meta div{padding:7px 9px;font-size:11px}
.lf-meta div+div{border-top:1px solid #000}
.lf-body{width:88%;margin:0 auto}
.lf-purpose{margin:0 0 10px;font-size:11px}
.lf-purpose p{margin:0 0 3px}
.lf-purpose .lf-blue{color:#3b7dc4;font-weight:700;display:block;margin-bottom:2px;font-size:12px}
.lf-main{width:100%;border-collapse:collapse;table-layout:fixed}
.lf-main thead{display:table-header-group}
.lf-main th{background:#d9d9d9;color:#2e6fb5;font-size:14px;border:1px solid #000;padding:3px 4px;text-align:center}
.lf-main td{border:1px solid #000;padding:2.5px 6px;vertical-align:top;word-wrap:break-word;overflow-wrap:anywhere}
.lf-main tr{break-inside:avoid;page-break-inside:avoid}
.lf-keep{break-inside:avoid;page-break-inside:avoid}
.lf-main td.lf-label{width:36%}
.lf-bar td{background:#ffff99;font-weight:700;font-size:11.5px}
.lf-text{white-space:pre-wrap;min-height:16px}
.lf-area{min-height:42px}
.lf-full{height:90px;white-space:pre-wrap}
.lf-opts{display:flex;flex-wrap:wrap;gap:2px 18px}
.lf-opts.lf-stack{display:block}
.lf-opts.lf-stack .lf-opt{display:block}
.lf-opt{white-space:normal}
.lf-box{font-family:"Segoe UI Symbol","DejaVu Sans",Arial,sans-serif;margin-right:3px}
.lf-blank{display:inline-block;min-width:90px;border-bottom:1px solid #000;vertical-align:bottom;padding:0 2px}
.lf-sign td{height:46px}
.lf-sign .lf-line{margin-top:3px}
.lf-sign .lf-line+.lf-line{margin-top:12px}
.lf-inner{width:100%;border-collapse:collapse}
.lf-main td.lf-tablecell{padding:0}
.lf-inner th{background:none;color:#3b7dc4;font-size:11px;border:0;border-bottom:1px solid #000;padding:2px 4px}
.lf-inner th+th{border-left:1px solid #000}
.lf-inner td{border:0;border-bottom:1px solid #000;padding:2px 6px;min-height:18px}
.lf-inner tr:last-child td{border-bottom:0}
.lf-inner td+td{border-left:1px solid #000}
.lf-notes{width:88%;margin:16px auto 0;font-size:10.5px;break-inside:avoid;page-break-inside:avoid}
.lf-notes b{display:block;margin-bottom:4px}
.lf-notes ul{margin:0;padding-left:20px;list-style:disc;color:#2e6fb5;font-style:italic}
.lf-notes li{margin:0 0 3px}
@media print{
  @page{size:A4;margin:12mm}
  html,body{background:#fff!important}
  .lf-sheet{box-shadow:none;max-width:none;padding:0;margin:0}
  .lf-noprint{display:none!important}
}
`;
