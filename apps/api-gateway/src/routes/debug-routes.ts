import { Router } from "express";
import {
  clearApiCalls,
  listApiCalls,
} from "../services/api-call-trace-store.js";

export const debugRoutes = Router();

debugRoutes.get("/api-calls/data", (_request, response) => {
  response.json({ calls: listApiCalls() });
});

debugRoutes.delete("/api-calls/data", (_request, response) => {
  clearApiCalls();
  response.status(204).end();
});

debugRoutes.get("/api-calls", (_request, response) => {
  response.type("html").send(`<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gateway API Calls</title><style>
body{margin:0;background:#0b1020;color:#e6edf7;font:14px system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:28px}
h1{margin:0;font-size:25px}.sub{color:#aab7cf;margin:8px 0 24px}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}
select,button{background:#161f35;border:1px solid #36445f;color:inherit;border-radius:6px;padding:8px 10px}button{cursor:pointer}
table{width:100%;border-collapse:collapse;background:#10182a;border:1px solid #293550}th,td{text-align:left;padding:11px;border-bottom:1px solid #293550}th{color:#9eb3d9;font-size:12px;text-transform:uppercase}
.method{font-weight:700}.GET{color:#67d9a4}.POST{color:#79b8ff}.DELETE{color:#ffb86b}.ok{color:#67d9a4}.fail{color:#ff7b8d}.muted{color:#9aa9c2}.details{display:none;background:#0b1020;color:#aab7cf;font-family:ui-monospace,monospace;white-space:pre-wrap}.row{cursor:pointer}.row:hover{background:#17223b}
@media(max-width:700px){main{padding:16px}th:nth-child(4),td:nth-child(4){display:none}table{font-size:12px}}
</style></head><body><main>
<h1>API Call Monitor</h1>
<div class="toolbar"><select id="service"><option value="">Tất cả service</option><option>Gateway</option><option>User</option><option>Content</option><option>Learning</option><option>Analytics</option></select>
<select id="status"><option value="">Mọi trạng thái</option><option value="ok">Thành công (2xx/3xx)</option><option value="fail">Lỗi (4xx/5xx)</option></select>
<button id="pause">Tạm dừng</button><button id="clear">Xóa lịch sử</button><span id="count" class="muted"></span></div>
<table><thead><tr><th>Thời gian</th><th>Luồng</th><th>Service</th><th>Request</th><th>Status</th><th>Thời gian xử lý</th></tr></thead><tbody id="calls"></tbody></table>
</main><script>
let paused=false;const $=id=>document.getElementById(id);const esc=value=>String(value??"").replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
function group(call){return call.kind==="browser"?"Browser → Gateway":"Gateway → "+call.service}
function render(calls){
  const service=$("service").value,status=$("status").value;
  const filtered=calls.filter(call=>{
    const matchesService=!service||call.service===service;
    const matchesStatus=!status||(status==="ok"?(call.status??0)<400:(call.status??0)>=400);
    return matchesService&&matchesStatus;
  });
  $("count").textContent=filtered.length+" call hiển thị";
  $("calls").innerHTML=filtered.map(call=>{
    const statusClass=(call.status??0)>=400?"fail":"ok";
    const detail="Target: "+esc(call.target??"Gateway public endpoint")+(call.parentId?"\\nLiên kết với request Gateway: "+esc(call.parentId):"")+(call.error?"\\nLỗi: "+esc(call.error):"");
    return '<tr class="row" data-id="'+call.id+'"><td>'+new Date(call.startedAt).toLocaleTimeString()+"</td><td>"+group(call)+"</td><td>"+call.service+"</td><td><span class=\\"method "+call.method+"\\">"+call.method+"</span> "+esc(call.path)+"</td><td class=\\""+statusClass+"\\">"+(call.status??"Đang chạy")+"</td><td>"+(call.durationMs===undefined?"…":call.durationMs+" ms")+'</td></tr><tr class="details" id="detail-'+call.id+'"><td colspan="6">'+detail+"</td></tr>";
  }).join("")||'<tr><td colspan="6" class="muted">Chưa có API call. Hãy dùng web rồi quay lại đây.</td></tr>';
  document.querySelectorAll(".row").forEach(row=>row.onclick=()=>{
    const detail=$("detail-"+row.dataset.id);
    detail.style.display=detail.style.display==="table-row"?"none":"table-row";
  });
}
async function load(){if(paused)return;const response=await fetch("/debug/api-calls/data");render((await response.json()).calls)}$("service").onchange=load;$("status").onchange=load;$("pause").onclick=()=>{paused=!paused;$("pause").textContent=paused?"Tiếp tục":"Tạm dừng"};$("clear").onclick=async()=>{await fetch("/debug/api-calls/data",{method:"DELETE"});load()};load();setInterval(load,2000);
</script></body></html>`);
});
