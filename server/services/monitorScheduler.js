
const pool = require("../config/db");
const { checkMonitor } = require("./monitorService");

const SCHEDULER_INTERVAL = 60 * 1000;

const startMonitorScheduler = () => {
  let isRunning = false;

  const runChecks = async () => {
    // Prevent overlapping scheduler executions.
    if (isRunning) {
      console.log("Previous scheduler run is still in progress. Skipping.");
      return;
    }

    isRunning = true;

    try {
      const result = await pool.query(
        `SELECT
           m.*,
           latest.checked_at AS last_checked_at
         FROM monitors m
         LEFT JOIN LATERAL (
           SELECT checked_at
           FROM checks
           WHERE monitor_id = m.id
           ORDER BY checked_at DESC
           LIMIT 1
         ) latest ON true
         WHERE m.is_active = TRUE`
      );

      let checksToRun = 0;

      for (const monitor of result.rows) {
        const now = Date.now();

        const lastChecked = monitor.last_checked_at
          ? new Date(monitor.last_checked_at).getTime()
          : null;

        const intervalMs = monitor.interval_seconds * 1000;

        const shouldCheck =
          !lastChecked || now - lastChecked >= intervalMs;

        if (!shouldCheck) {
          continue;
        }

        checksToRun++;

        try {
          const check = await checkMonitor(monitor);

          console.log(
            `[Monitor: ${monitor.name}]`,
            check.isSuccess ? "UP" : "DOWN",
            `${check.responseTime}ms`
          );
        } catch (error) {
          console.error(
            `Failed to check monitor ${monitor.id}:`,
            error.message
          );
        }
      }

      if (checksToRun > 0) {
        console.log(`Checked ${checksToRun} monitor(s).`);
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    } finally {
      isRunning = false;
    }
  };

  // Run once immediately when the server starts.
  runChecks();

  // Run the scheduler every 60 seconds.
  setInterval(runChecks, SCHEDULER_INTERVAL);

  console.log("Monitor scheduler started.");
};

module.exports = {
  startMonitorScheduler,
};
