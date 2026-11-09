const pool = require("../config/db");

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const monitorsResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM monitors
       WHERE user_id = $1`,
      [userId]
    );

    const healthyResult = await pool.query(
      `SELECT COUNT(DISTINCT m.id)::int AS count
       FROM monitors m
       JOIN LATERAL (
         SELECT is_success
         FROM checks
         WHERE monitor_id = m.id
         ORDER BY checked_at DESC
         LIMIT 1
       ) latest ON true
       WHERE m.user_id = $1
         AND latest.is_success = true`,
      [userId]
    );

    const incidentsResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM incidents i
       JOIN monitors m ON m.id = i.monitor_id
       WHERE m.user_id = $1
         AND i.status = 'open'`,
      [userId]
    );

    const responseResult = await pool.query(
      `SELECT COALESCE(ROUND(AVG(c.response_time_ms)), 0)::int AS average
       FROM checks c
       JOIN monitors m ON m.id = c.monitor_id
       WHERE m.user_id = $1`,
      [userId]
    );

    return res.json({
      monitoredApis: monitorsResult.rows[0].count,
      healthy: healthyResult.rows[0].count,
      incidents: incidentsResult.rows[0].count,
      avgResponse: responseResult.rows[0].average,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    return res.status(500).json({
      message: "Could not load dashboard statistics",
    });
  }
};

module.exports = {
  getDashboardStats,
};