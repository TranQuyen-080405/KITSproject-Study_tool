import { createReadStream } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resultsDirectory = path.join(rootDirectory, "results");
const outputPath = path.join(rootDirectory, "KET_QUA_TONG_HOP.md");

const readJson = async (filePath) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
};

const numberOrNull = (value) => (Number.isFinite(value) ? value : null);

const format = (value, digits = 2) =>
  Number.isFinite(value) ? Number(value).toFixed(digits) : "—";

const percent = (value) =>
  Number.isFinite(value) ? `${(Number(value) * 100).toFixed(2)}%` : "—";

function percentile(sorted, ratio) {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(ratio * sorted.length) - 1));
  return sorted[index];
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

async function endpointStats(metricsPath, summary) {
  const fromSummary = {};
  for (const [name, metric] of Object.entries(summary?.metrics || {})) {
    if (!name.startsWith("http_req_duration{name:")) continue;
    const endpoint = name.slice("http_req_duration{name:".length, -1);
    fromSummary[endpoint] = numberOrNull(metric.values?.["p(95)"]);
  }
  if (Object.keys(fromSummary).length > 0) return fromSummary;

  const groups = new Map();
  try {
    const lines = readline.createInterface({
      input: createReadStream(metricsPath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });
    for await (const line of lines) {
      if (!line.includes('"metric":"http_req_duration"')) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }
      if (row.type !== "Point" || row.metric !== "http_req_duration") continue;
      const endpoint = row.data?.tags?.name;
      const value = row.data?.value;
      if (!endpoint || !Number.isFinite(value)) continue;
      if (!groups.has(endpoint)) groups.set(endpoint, []);
      groups.get(endpoint).push(value);
    }
  } catch {
    return {};
  }
  const result = {};
  for (const [endpoint, values] of groups) {
    values.sort((left, right) => left - right);
    result[endpoint] = percentile(values, 0.95);
  }
  return result;
}

function metricRow(run) {
  const metrics = run.summary?.metrics || {};
  const duration = metrics.http_req_duration?.values || {};
  const row = {
    p95: numberOrNull(duration["p(95)"]),
    p99: numberOrNull(duration["p(99)"]),
    rps: numberOrNull(metrics.http_reqs?.values?.rate),
    errorRate: numberOrNull(metrics.http_req_failed?.values?.rate),
    checks: numberOrNull(metrics.checks?.values?.rate),
    dropped: numberOrNull(metrics.dropped_iterations?.values?.count),
    requests: numberOrNull(metrics.http_reqs?.values?.count),
    iterations: numberOrNull(metrics.iterations?.values?.count),
    chatP95: numberOrNull(metrics.chat_e2e_duration?.values?.["p(95)"]),
  };
  if (!Number.isFinite(row.requests) || row.requests <= 0) {
    row.p95 = null;
    row.p99 = null;
    row.rps = null;
    row.chatP95 = null;
  }
  return row;
}

async function loadRuns() {
  let names = [];
  try {
    names = (await readdir(resultsDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
  const runs = [];
  for (const name of names) {
    const directory = path.join(resultsDirectory, name);
    const info = await readJson(path.join(directory, "run-info.json"));
    if (!info) continue;
    const summary = await readJson(path.join(directory, "summary.json"));
    const resources = await readJson(path.join(directory, "resources-summary.json"));
    runs.push({
      name,
      directory,
      info,
      summary,
      resources,
      row: metricRow({ summary }),
      endpoints: await endpointStats(path.join(directory, "metrics.jsonl"), summary),
    });
  }
  return runs;
}

function groupBy(runs, scenario, keyFn) {
  const groups = new Map();
  for (const run of runs.filter((item) => item.info.scenario === scenario)) {
    const key = keyFn(run);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }
  return groups;
}

function combinedMedian(runs, field) {
  return median(runs.map((run) => run.row[field]));
}

function analysis(loadGroups) {
  const levels = [...loadGroups.keys()].sort((left, right) => left - right);
  if (levels.length < 2) return ["Chưa đủ hai mức VU để so sánh độ dốc p95 và RPS."];
  const lines = [];
  const rows = levels.map((vus) => ({
    vus,
    p95: combinedMedian(loadGroups.get(vus), "p95"),
    rps: combinedMedian(loadGroups.get(vus), "rps"),
    errorRate: combinedMedian(loadGroups.get(vus), "errorRate"),
  }));
  const p95Growth = [];
  const rpsGrowth = [];
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    if (Number.isFinite(previous.p95) && previous.p95 > 0 && Number.isFinite(current.p95)) {
      p95Growth.push(current.p95 / previous.p95);
    }
    if (Number.isFinite(previous.rps) && previous.rps > 0 && Number.isFinite(current.rps)) {
      const expected = current.vus / previous.vus;
      rpsGrowth.push({ expected, actual: current.rps / previous.rps, vus: current.vus });
    }
  }
  if (p95Growth.length > 0) {
    let fastest = 0;
    let fastestAt = null;
    for (let index = 1; index < rows.length; index += 1) {
      const previous = rows[index - 1];
      const current = rows[index];
      if (Number.isFinite(previous.p95) && previous.p95 > 0 && Number.isFinite(current.p95)) {
        const ratio = current.p95 / previous.p95;
        if (ratio > fastest) {
          fastest = ratio;
          fastestAt = `${previous.vus} → ${current.vus}`;
        }
      }
    }
    lines.push(
      fastest >= 2
        ? `p95 tăng nhanh ở bước ${fastestAt}: ${fastest.toFixed(2)} lần so với mức liền trước.`
        : `p95 tăng chậm theo VU. Bước lớn nhất là ${fastestAt}: ${fastest.toFixed(2)} lần.`,
    );
  }
  const flat = rpsGrowth.find((step) => step.actual < step.expected * 0.8);
  if (flat) {
    lines.push(
      `RPS bắt đầu chậm hơn VU từ mức ${flat.vus}: RPS tăng ${flat.actual.toFixed(2)} lần trong khi số VU tăng ${flat.expected.toFixed(2)} lần.`,
    );
  } else if (rpsGrowth.length > 0) {
    lines.push("RPS vẫn tăng gần tương ứng với VU ở các mức đã đo.");
  }
  const failing = rows.find(
    (row) =>
      (Number.isFinite(row.errorRate) && row.errorRate >= 0.01) ||
      (Number.isFinite(row.p95) && row.p95 >= 500),
  );
  if (failing) {
    lines.push(
      `Mốc đánh giá thử nghiệm (p95 500 ms hoặc lỗi từ 1%) bắt đầu không đạt ở ${failing.vus} VU: p95 ${format(failing.p95)} ms, lỗi ${percent(failing.errorRate)}.`,
    );
  } else if (rows.every((row) => Number.isFinite(row.p95))) {
    lines.push(
      "Trong các mức VU đã đo, p95 trung vị vẫn dưới 500 ms và tỷ lệ lỗi trung vị dưới 1%.",
    );
  }
  return lines;
}

function capacityCeiling(groups) {
  const rates = [...groups.keys()].sort((left, right) => left - right);
  let best = null;
  for (const rate of rates) {
    const runs = groups.get(rate);
    const p95 = combinedMedian(runs, "p95");
    const errorRate = combinedMedian(runs, "errorRate");
    const dropped = combinedMedian(runs, "dropped");
    const holds =
      Number.isFinite(p95) &&
      p95 < 500 &&
      Number.isFinite(errorRate) &&
      errorRate < 0.01 &&
      (dropped === null || dropped === 0);
    if (holds) best = rate;
    else break;
  }
  return best;
}

function resourceLine(run) {
  const resources = run.resources;
  if (!resources?.samples) return "—";
  const databases = Object.entries(resources.database_connections_max || {})
    .map(([name, count]) => `${name}:${count}`)
    .join(", ");
  return `CPU avg ${format(resources.cpu_percent_avg)}% / max ${format(resources.cpu_percent_max)}%; RAM dùng max ${format(resources.memory_used_percent_max)}%; Postgres max ${databases || "—"}${resources.database_error ? ` (${resources.database_error})` : ""}`;
}

export async function writeAggregateReport() {
  const runs = await loadRuns();
  const notes = await readJson(path.join(resultsDirectory, "suite-notes.json"));
  const lines = [
    "# Tổng hợp kiểm thử hiệu năng k6",
    "",
    "Số trong các bảng lấy từ `summary.json` của từng lần chạy. Ô không có summary hợp lệ để `—`. Các mức VU và RATE là cấu hình thử nghiệm, không phải năng lực đã được chứng nhận.",
    "",
  ];
  if (Number.isFinite(notes?.access_token_minutes)) {
    lines.push(
      `User service của lần đo này chạy với \`ACCESS_TOKEN_MINUTES=${notes.access_token_minutes}\` để soak 30 phút không hết hạn token giữa chừng. Mặc định trong code service là 15 phút.`,
      "",
    );
  }
  lines.push(
    "Ngưỡng đánh giá GET: p95 dưới 500 ms, p99 dưới 1000 ms, lỗi HTTP dưới 1%, checks trên 99%. Đây là mốc thử nghiệm, chưa phải SLO phát hành.",
    "",
  );

  if (runs.length === 0) {
    lines.push("Chưa có thư mục kết quả.");
    await writeFile(outputPath, lines.join("\n"), "utf8");
    return outputPath;
  }

  const first = runs.find((run) => run.info.base_url) || runs[0];
  lines.push("## Điều kiện đo", "");
  lines.push(`- Target: \`${first.info.base_url}\``);
  lines.push(`- Môi trường: \`${first.info.target_env}\``);
  lines.push(`- k6: \`${first.info.k6_version}\``);
  lines.push(`- Git commit: \`${first.info.git_commit}\``);
  lines.push("- Think time của smoke, load, stress, spike và soak: 1 giây sau mỗi vòng 5 GET.");
  lines.push("- Capacity không nghỉ giữa vòng. k6 tự tạo số iteration mỗi giây.");
  lines.push("- CPU, RAM và số kết nối Postgres lấy trên máy đang chạy test. Bộ này không thu docker stats.", "");

  const loadGroups = groupBy(runs, "load", (run) => Number(run.info.load?.vus));
  lines.push("## Load theo từng mức VU", "");
  lines.push("Mỗi mức giữ `constant-vus` trong 3 phút và lặp 3 lần khi lần chạy hoàn tất. Cột trung vị là median của các lần có số đo.");
  lines.push("");
  lines.push("| VU | p95 (ms) | RPS | Error rate |");
  lines.push("| ---: | ---: | ---: | ---: |");
  for (const vus of [5, 10, 20, 30, 50]) {
    const group = loadGroups.get(vus) || [];
    lines.push(
      `| ${vus} | ${format(combinedMedian(group, "p95"))} | ${format(combinedMedian(group, "rps"))} | ${percent(combinedMedian(group, "errorRate"))} |`,
    );
  }
  lines.push("");
  lines.push("### Đọc bảng load", "");
  for (const line of analysis(loadGroups)) lines.push(`- ${line}`);
  lines.push("");

  lines.push("### Từng lần load", "");
  lines.push("| VU | Lần | Trạng thái | p95 | p99 | RPS | Error rate | Requests | CPU / RAM / DB |");
  lines.push("| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const vus of [...loadGroups.keys()].sort((left, right) => left - right)) {
    loadGroups.get(vus).forEach((run, index) => {
      lines.push(
        `| ${vus} | ${index + 1} | ${run.info.status} | ${format(run.row.p95)} | ${format(run.row.p99)} | ${format(run.row.rps)} | ${percent(run.row.errorRate)} | ${format(run.row.requests, 0)} | ${resourceLine(run)} |`,
      );
    });
  }
  lines.push("");

  const endpointNames = [
    ...new Set(runs.filter((run) => run.info.scenario === "load").flatMap((run) => Object.keys(run.endpoints))),
  ].sort();
  lines.push("### p95 theo endpoint ở từng mức VU", "");
  if (endpointNames.length === 0) {
    lines.push("Chưa có mẫu `http_req_duration` theo tag endpoint.", "");
  } else {
    const levels = [5, 10, 20, 30, 50].filter((vus) => loadGroups.has(vus));
    lines.push(`| Endpoint | ${levels.map((vus) => `${vus} VU`).join(" | ")} |`);
    lines.push(`| --- | ${levels.map(() => "---:").join(" | ")} |`);
    for (const endpoint of endpointNames) {
      const cells = levels.map((vus) =>
        format(median((loadGroups.get(vus) || []).map((run) => run.endpoints[endpoint]))),
      );
      lines.push(`| ${endpoint} | ${cells.join(" | ")} |`);
    }
    lines.push("");
  }

  const capacityGroups = groupBy(runs, "capacity", (run) => Number(run.info.load?.rate));
  lines.push("## Capacity", "");
  lines.push(
    "Executor `constant-arrival-rate`, mỗi mức 3 phút, không `sleep`. Một iteration gọi đúng các GET của journey. Nếu danh sách bộ thẻ có phần tử thì thêm GET chi tiết, nên số request mục tiêu xấp xỉ `RATE × số GET mỗi vòng`.",
  );
  lines.push("");
  lines.push("| RATE (iter/s) | p95 (ms) | RPS thực tế | Error rate | Dropped iterations | Trạng thái |");
  lines.push("| ---: | ---: | ---: | ---: | ---: | --- |");
  for (const rate of [5, 10, 15, 20]) {
    const group = capacityGroups.get(rate) || [];
    const status = group.map((run) => run.info.status).join(", ") || "—";
    lines.push(
      `| ${rate} | ${format(combinedMedian(group, "p95"))} | ${format(combinedMedian(group, "rps"))} | ${percent(combinedMedian(group, "errorRate"))} | ${format(combinedMedian(group, "dropped"), 0)} | ${status} |`,
    );
  }
  lines.push("");
  const ceiling = capacityCeiling(capacityGroups);
  if ([...capacityGroups.keys()].length === 0) {
    lines.push("Chưa có lần capacity.", "");
  } else if (ceiling === null) {
    lines.push(
      "Không có mức RATE nào đồng thời giữ p95 dưới 500 ms, lỗi dưới 1% và dropped iterations bằng 0.",
      "",
    );
  } else {
    const rps = combinedMedian(capacityGroups.get(ceiling), "rps");
    lines.push(
      `Mức RATE cao nhất còn đạt cả ba tiêu chí là ${ceiling} iteration/giây, tương ứng RPS thực tế ${format(rps)}.`,
      "",
    );
  }

  lines.push("## Smoke, stress, spike, soak", "");
  lines.push("| Kịch bản | Cấu hình | Trạng thái | p95 | p99 | RPS | Error rate | Dropped | CPU / RAM / DB |");
  lines.push("| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const scenario of ["smoke", "stress", "spike", "soak"]) {
    for (const run of runs.filter((item) => item.info.scenario === scenario)) {
      lines.push(
        `| ${scenario} | \`${JSON.stringify(run.info.load || {})}\` | ${run.info.status} | ${format(run.row.p95)} | ${format(run.row.p99)} | ${format(run.row.rps)} | ${percent(run.row.errorRate)} | ${format(run.row.dropped, 0)} | ${resourceLine(run)} |`,
      );
    }
  }
  lines.push("");

  lines.push("## Chat end-to-end", "");
  lines.push(
    "API chat trả một JSON sau khi mô hình sinh xong (`disable_streaming=True`). `http_req_duration` của POST message là thời gian từ lúc gửi câu hỏi đến khi nhận đủ phản hồi. Time to first token không đo được vì không có luồng token.",
  );
  lines.push("");
  const chats = runs.filter((run) => run.info.scenario === "chat");
  if (chats.length === 0) {
    lines.push("Chưa chạy bài chat.", "");
  } else {
    lines.push("| Trạng thái | Requests | p95 e2e (ms) | p95 HTTP (ms) | Error rate | Ghi chú |");
    lines.push("| --- | ---: | ---: | ---: | ---: | --- |");
    for (const run of chats) {
      lines.push(
        `| ${run.info.status} | ${format(run.row.requests, 0)} | ${format(run.row.chatP95)} | ${format(run.row.p95)} | ${percent(run.row.errorRate)} | ${run.info.error || "3 câu hỏi, 1 VU"} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Thư mục kết quả", "");
  for (const run of runs) {
    lines.push(`- \`${run.name}\`: ${run.info.scenario}, ${run.info.status}`);
  }
  lines.push("");

  await writeFile(outputPath, `${lines.join("\n")}`, "utf8");
  return outputPath;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeAggregateReport()
    .then((output) => {
      console.log(output);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
