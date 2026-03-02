import { relative } from "path";
import chalk from "chalk";

/** Stylish-like formatter that prints paths relative to cwd. */
export default function (results) {
  const cwd = process.cwd();
  let output = "";
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    if (result.messages.length === 0) continue;

    const relPath = relative(cwd, result.filePath);

    for (const msg of result.messages) {
      const type =
        msg.severity === 2
          ? chalk.red("error")
          : chalk.yellow("warning");
      if (msg.severity === 2) totalErrors++;
      else totalWarnings++;
      output += `${relPath}:${msg.line}:${msg.column}  ${type}  ${msg.message}  ${chalk.dim(msg.ruleId)}\n`;
    }
  }

  const total = totalErrors + totalWarnings;
  if (total > 0) {
    const summary = chalk.red.bold(
      `\n\u2716 ${total} problem${total === 1 ? "" : "s"} (${totalErrors} error${totalErrors === 1 ? "" : "s"}, ${totalWarnings} warning${totalWarnings === 1 ? "" : "s"})\n`,
    );
    output += summary;
  }

  return output;
}
