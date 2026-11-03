import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const readJson = async (filePath) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
};

const format = (value, digits = 2) =>
  Number.isFinite(value) ? Number(value).toFixed(digits) : "NOT_AVAILABLE";

const percent = (value) =>
  Number.isFinite(value) ? `${(Number(value) * 100).toFixed(2)}%` : "NOT_AVAILABLE";

const cell = (value) => String(value ?? "NOT_AVAILABLE").replace(/\|/g, "\\|");

const metricValueForCondition = (values, condition) => {
  const key = condition.match(/^(p\(\d+\)|avg|med|max|min|rate|count)/)?.[1];
  return key ? values?.[key] : undefined;
};

function overallThresholdStatus(summary) {
  const thresholdResults = Object.values(summary?.metrics || {}).flatMap((metric) =>
    Object.values(metric.thresholds || {}),
  );
  if (thresholdResults.length === 0) return null;
  return thresholdResults.every((result) => result.ok);
}

export async function generateReport(resultDirectory) {
  const runInfo = await readJson(path.join(resultDirectory, "run-info.json"));
  const summary = await readJson(path.join(resultDirectory, "summary.json"));
  const metrics = summary?.metrics || {};
  const lines = ["# Báo cáo hiệu năng k6", ""];

  lines.push("## Thông tin lần chạy", "");
  lines.push(`- Run ID: \`${cell(runInfo?.run_id)}\``);
  lines.push(`- Scenario: \`${cell(runInfo?.scenario)}\``);
  lines.push(`- Environment: \`${cell(runInfo?.target_env)}\``);
  lines.push(`- Target: \`${cell(runInfo?.base_url)}\``);
  lines.push(`- Bắt đầu: ${cell(runInfo?.started_at)}`);
  lines.push(`- Kết thúc: ${cell(runInfo?.finished_at)}`);
  lines.push(`- Thời lượng thực tế: ${format(runInfo?.duration_seconds)} giây`);
  lines.push(`- Git commit: \`${cell(runInfo?.git_commit)}\``);
  lines.push(`- k6: \`${cell(runInfo?.k6_version)}\``);
  lines.push(`- Cấu hình tải: \`${cell(JSON.stringify(runInfo?.load || {}))}\``);
  lines.push(`- Trạng thái runner: **${cell(runInfo?.status || "INCOMPLETE")}**`, "");

  lines.push("## Summary", "");
  lines.push("| Metric | Total/Rate | Avg | Median | p90 | p95 | p99 | Max |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  const summaryRows = [
    ["http_reqs", metrics.http_reqs, "count"],
    ["http_req_duration (ms)", metrics.http_req_duration, null],
    ["http_req_failed", metrics.http_req_failed, "rate"],
    ["checks", metrics.checks, "rate"],
    ["iterations", metrics.iterations, "count"],
    ["dropped_iterations", metrics.dropped_iterations, "count"],
  ];
  for (const [name, metric, totalKey] of summaryRows) {
    const values = metric?.values || {};
    const total =
      totalKey === "rate"
        ? percent(values.rate)
        : totalKey
          ? format(values[totalKey], 0)
          : "—";
    lines.push(
      `| ${name} | ${total} | ${format(values.avg)} | ${format(values.med)} | ${format(values["p(90)"])} | ${format(values["p(95)"])} | ${format(values["p(99)"])} | ${format(values.max)} |`,
    );
  }
  lines.push("");

  lines.push("## Threshold results", "");
  const thresholdRows = Object.entries(metrics).flatMap(([metricName, metric]) =>
    Object.entries(metric.thresholds || {}).map(([condition, result]) => ({
      metricName,
      condition,
      value: metricValueForCondition(metric.values, condition),
      ok: result.ok,
    })),
  );
  if (thresholdRows.length === 0) {
    lines.push("NOT_AVAILABLE — summary không có threshold thực tế.", "");
  } else {
    lines.push("| Metric | Điều kiện | Giá trị | Kết quả |");
    lines.push("| --- | --- | ---: | --- |");
    for (const row of thresholdRows) {
      const measured = row.condition.startsWith("rate")
        ? percent(row.value)
        : format(row.value);
      lines.push(
        `| ${cell(row.metricName)} | \`${cell(row.condition)}\` | ${measured} | **${row.ok ? "PASS" : "FAIL"}** |`,
      );
    }
    lines.push("");
  }

  lines.push("## Theo endpoint", "");
  const endpointMetrics = Object.entries(metrics).filter(([name]) =>
    name.startsWith("http_req_duration{name:"),
  );
  if (endpointMetrics.length === 0) {
    lines.push(
      "NOT_AVAILABLE — phiên bản k6 hoặc summary hiện tại không xuất submetric theo tag `name`.",
      "",
    );
  } else {
    lines.push("| Endpoint tag | Requests | Avg (ms) | p95 (ms) | Max (ms) |");
    lines.push("| --- | ---: | ---: | ---: | ---: |");
    for (const [name, metric] of endpointMetrics) {
      const endpoint = name.slice("http_req_duration{name:".length, -1);
      const values = metric.values || {};
      lines.push(
        `| ${cell(endpoint)} | ${format(values.count, 0)} | ${format(values.avg)} | ${format(values["p(95)"])} | ${format(values.max)} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Nhận xét", "");
  if (!summary) {
    lines.push(
      "Không có `summary.json` hợp lệ nên không thể kết luận latency, throughput hoặc error rate.",
    );
  } else if (metrics.http_req_failed?.values?.rate > 0) {
    lines.push(
      `Có ${percent(metrics.http_req_failed.values.rate)} HTTP request bị đánh dấu thất bại. Xem \`console.log\` và \`metrics.jsonl\` để xác định endpoint; chưa đủ dữ liệu để quy kết CPU, RAM hoặc database.`,
    );
  } else {
    lines.push(
      "Không ghi nhận HTTP request thất bại trong summary. Kết quả này chỉ đại diện cho kịch bản, dữ liệu và môi trường của lần chạy.",
    );
  }
  lines.push("");

  const thresholdsPassed = overallThresholdStatus(summary);
  const conclusion =
    runInfo?.status === "STOPPED"
      ? "STOPPED"
      : !summary || ["ERROR", "NOT_RUN"].includes(runInfo?.status)
        ? "INCOMPLETE"
        : thresholdsPassed === false || runInfo?.status === "FAIL"
          ? "FAIL"
          : runInfo?.status === "PASS"
            ? "PASS"
            : "INCOMPLETE";
  lines.push("## Kết luận", "", `**${conclusion}**`);
  if (conclusion === "INCOMPLETE") {
    lines.push(
      "",
      `Lý do: ${cell(runInfo?.error || "Thiếu dữ liệu summary hoặc lần chạy không hoàn tất.")}`,
    );
  } else if (conclusion === "FAIL") {
    lines.push("", "Ít nhất một threshold không đạt. Kiểm tra bảng threshold trước khi tăng tải.");
  } else if (conclusion === "STOPPED") {
    lines.push("", `Đã dừng vì máy hoặc API quá tải: ${cell(runInfo?.error)}`);
  } else {
    lines.push("", "Các threshold ban đầu đều đạt; cần xác nhận lại SLO trước khi dùng làm tiêu chuẩn phát hành.");
  }
  lines.push(
    "",
    "## Artifacts",
    "",
  );
  const artifacts = [
    ["dashboard.html", "HTML dashboard"],
    ["summary.json", "k6 summary"],
    ["metrics.jsonl", "Raw metrics JSONL"],
    ["console.log", "Console log"],
  ];
  for (const [fileName, label] of artifacts) {
    lines.push(
      existsSync(path.join(resultDirectory, fileName))
        ? `- [${label}](./${fileName})`
        : `- ${label}: \`NOT_CREATED\``,
    );
  }
  lines.push("");

  const resources = await readJson(path.join(resultDirectory, "resources-summary.json"));
  lines.push("## Máy kiểm thử và database", "");
  if (!resources || !resources.samples) {
    lines.push("NOT_AVAILABLE — không có `resources-summary.json`.", "");
  } else {
    lines.push(`- Mẫu: ${resources.samples}`);
    lines.push(`- CPU trung bình: ${format(resources.cpu_percent_avg)}%`);
    lines.push(`- CPU cao nhất: ${format(resources.cpu_percent_max)}%`);
    lines.push(`- RAM đã dùng, mức cao nhất: ${format(resources.memory_used_percent_max)}%`);
    lines.push(`- RAM trống thấp nhất: ${format(resources.memory_free_mb_min, 0)} MB`);
    const databases = resources.database_connections_max || {};
    const dbText = Object.entries(databases)
      .map(([name, count]) => `${name}=${count}`)
      .join(", ");
    lines.push(
      `- Kết nối Postgres cao nhất: ${dbText || "NOT_AVAILABLE"}${resources.database_error ? ` (${resources.database_error})` : ""}`,
    );
    const processText = Object.entries(resources.process_memory_mb_max || {})
      .map(([name, row]) => `${name} ${row.working_set_mb_max} MB`)
      .join(", ");
    lines.push(`- Working set cao nhất: ${processText || "NOT_AVAILABLE"}`, "");
  }

  await writeFile(path.join(resultDirectory, "report.md"), lines.join("\n"), "utf8");
  return conclusion;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const resultDirectory = process.argv[2];
  if (!resultDirectory) {
    console.error("Usage: node generate-report.mjs <result-directory>");
    process.exitCode = 2;
  } else {
    generateReport(path.resolve(resultDirectory)).catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  }
}
