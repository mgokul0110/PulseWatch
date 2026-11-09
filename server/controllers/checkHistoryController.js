const pool = require("../config/db");

const getCheckHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const monitorResult = await pool.query(
      `SELECT id
       FROM monitors
       WHERE id = $1
         AND user_id = $2`,
      [id, userId]
    );

    if (monitorResult.rows.length === 0) {
      return res.status(404).json({
        message: "Monitor not found",
      });
    }

    const result = await pool.query(
      `SELECT
         id,
         status_code,
         response_time_ms,
         is_success,
         error_message,
         checked_at
       FROM checks
       WHERE monitor_id = $1
       ORDER BY checked_at DESC
       LIMIT 100`,
      [id]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Check history error:", error);

    return res.status(500).json({
      message: "Could not load check history",
    });
  }
};

module.exports = {
  getCheckHistory,
};