const pool = require("../config/db");

const getMonitorStatuses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
         m.id,
         m.name,
         m.url,
         m.method,
         m.expected_status,
         m.interval_seconds,
         m.is_active,
         c.status_code,
         c.response_time_ms,
         c.is_success,
         c.error_message,
         c.checked_at
       FROM monitors m
       LEFT JOIN LATERAL (
         SELECT
           status_code,
           response_time_ms,
           is_success,
           error_message,
           checked_at
         FROM checks
         WHERE monitor_id = m.id
         ORDER BY checked_at DESC
         LIMIT 1
       ) c ON true
       WHERE m.user_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Monitor status error:", error);

    return res.status(500).json({
      message: "Could not load monitor statuses",
    });
  }
};

module.exports = {
  getMonitorStatuses,
};