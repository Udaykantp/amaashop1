/**
 * Structured JSON logger. In production (Cloud Run / Cloud Logging) each line
 * is a JSON object on stdout with a `severity` field Cloud Logging understands.
 * In development it prints a compact human line.
 *
 * Every commission event and payout MUST be logged through this (brief §6).
 * No `server-only` import: the standalone worker uses this too.
 */

type Severity = "DEBUG" | "INFO" | "WARNING" | "ERROR";

type Fields = Record<string, unknown>;

function emit(severity: Severity, message: string, fields?: Fields) {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    process.stdout.write(
      JSON.stringify({ severity, message, time: new Date().toISOString(), ...fields }) + "\n",
    );
  } else {
    const suffix = fields && Object.keys(fields).length ? " " + JSON.stringify(fields) : "";
    console[severity === "ERROR" ? "error" : severity === "WARNING" ? "warn" : "log"](
      `[${severity}] ${message}${suffix}`,
    );
  }
}

export const log = {
  debug: (msg: string, fields?: Fields) => emit("DEBUG", msg, fields),
  info: (msg: string, fields?: Fields) => emit("INFO", msg, fields),
  warn: (msg: string, fields?: Fields) => emit("WARNING", msg, fields),
  error: (msg: string, fields?: Fields) => emit("ERROR", msg, fields),
};
